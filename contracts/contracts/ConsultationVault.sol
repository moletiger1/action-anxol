// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title ConsultationVault（共同相談費の募集別金庫）
/// @notice 集団訴訟.jp（仮）のデモ用。テストネット・ローカル専用で、実資金には使わない。
///         1つの募集につき1つの金庫を作り、資金を募集ごとに分離する。
/// @dev 設計上の約束:
///  - 支払条件（費目・上限・確認者・異議担当と裁定数・返金条件・期限）は作成時に固定し、誰も変更できない。
///  - 任意の宛先への送金関数は存在しない。支払先は審議役の採択で登録された受取先だけ。
///  - 支出確認担当の確認数が閾値に達し、支払待機期間が過ぎ、異議・停止がないときだけ支払える。
///  - 支払条件が未設定（isConfigured=false）なら拠出を受け付けない。
///  - 返金は本人が請求する pull 方式。管理者の承認を必要としない。
///  - コントラクトは自分から動かない。支払い・返金・期限切れ処理には誰かの取引が必要。
///  - 個人情報・書類は保存しない。文書はハッシュ（bytes32）で参照するだけ。
///  - 賠償金・和解金（円）の分配は扱わない（v1 はオフチェーン）。
///  - 拠出額は議決権にも賠償金の取り分にもならない。拠出者ができるのは異議の申し立てと返金請求のみ。
contract ConsultationVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // 型
    // ---------------------------------------------------------------------

    /// @notice 作成時に渡す費目（予算の内訳）。
    struct LineItemInit {
        bytes32 id; // 費目ID（例: keccak256("consultation")）
        bytes32 labelHash; // 費目の説明文のハッシュ（本文はオフチェーン）
        uint256 cap; // 費目の上限額（資産の最小単位）
    }

    /// @notice 作成時に固定される募集条件。
    struct Config {
        IERC20 asset; // 拠出に使う資産（デモでは MockUSDC）
        bytes32 eventId; // 共通事件ページID（募集IDとは別）
        bytes32 recruitmentId; // 募集ID
        bytes32 termsHash; // 募集条件文書（使途・支払先条件・確認者・返金条件）のハッシュ
        uint256 goal; // 目標額。これを超える拠出は受け付けない（超過募集なし）
        uint64 fundingDeadline; // 募集期限。これ以降は拠出できない
        uint64 closeTime; // 相談実施期限。以後は新規契約を登録できず、未拘束残高が返金対象になる
        uint64 settlementPeriod; // closeTime 後、登録済み契約の支払いを待つ期間
        uint64 disputeWindow; // 確認完了から支払実行可能になるまでの待機期間
        uint64 maxPauseDuration; // 1回の期限付き停止の最大長（0 なら停止機能なし）
        uint64 maxTotalPause; // 停止の累計上限（無期限拘束を防ぐ）
        LineItemInit[] lineItems;
        address[] deliberators; // 審議役（契約の採択・早期終了）
        uint256 deliberationThreshold;
        address[] approvers; // 支出確認担当（請求の履行確認）
        uint256 approvalThreshold;
        address[] disputeResolvers; // 異議確認担当（異議の裁定・期限付き停止）
        uint256 disputeResolutionThreshold; // 裁定を確定するために必要な賛成数
    }

    struct LineItem {
        bytes32 labelHash;
        uint256 cap;
        uint256 committed; // 登録済み契約で拘束中の額
        uint256 spent; // 支払済みの額
        bool exists;
    }

    /// @notice 募集の段階。
    enum Phase {
        NotConfigured, // 支払条件が未設定。拠出不可
        Funding, // 募集中
        Failed, // 期限までに目標未達（または目標到達前に早期終了）。全額返金
        Active, // 目標到達。契約登録・支払いが可能
        Closed // 相談実施期限の経過または早期終了。未拘束残高を按分返金
    }

    enum SpendStatus {
        None,
        Proposed, // 審議役が契約を提案、採択の賛成待ち
        Registered, // 採択済み。上限額を拘束中。請求待ち
        Invoiced, // 受取先が請求済み。確認待ち
        Paid, // 支払済み
        Expired // 精算期限切れ。拘束を解除
    }

    struct Spend {
        bytes32 lineItemId;
        address payee;
        uint256 cap;
        bytes32 termsHash; // 契約条件文書のハッシュ
        SpendStatus status;
        uint256 adoptionApprovals;
        uint256 invoiceAmount;
        bytes32 invoiceHash;
        uint64 invoicedAt;
        uint64 confirmedAt; // 確認数が閾値に達した時刻（0 は未達）
        uint256 round; // 請求の回数。差し戻し後の再請求で旧い確認を無効化する
        uint256 confirmations;
        bool disputed;
        bool disputeUsedThisRound;
        address disputer;
    }

    // ---------------------------------------------------------------------
    // エラー
    // ---------------------------------------------------------------------

    error InvalidConfig(string reason);
    error NotConfigured();
    error WrongPhase(Phase current);
    error FundingClosed();
    error ZeroAmount();
    error ExceedsGoal(uint256 remaining);
    error UnexpectedTransferAmount();
    error Paused(uint64 until);
    error NotDeliberator();
    error NotApprover();
    error NotResolver();
    error NotPayee();
    error NotStakeholder();
    error ResolverCannotContribute();
    error InvalidSpendId();
    error SpendIdAlreadyUsed(bytes32 spendId);
    error UnknownLineItem(bytes32 lineItemId);
    error InvalidPayee();
    error PayeeNotIndependent();
    error MissingHash();
    error LineItemCapExceeded(uint256 available);
    error TotalCapExceeded(uint256 available);
    error WrongSpendStatus(SpendStatus current);
    error AlreadyApproved();
    error InvoiceExceedsCap(uint256 cap);
    error ThresholdNotMet(uint256 confirmations, uint256 threshold);
    error DisputeWindowOpen(uint64 executableAt);
    error UnderDispute();
    error DisputeAlreadyUsed();
    error NotUnderDispute();
    error CannotResolveOwnDispute();
    error ResolutionAlreadyApproved();
    error SettlementPeriodOver();
    error SettlementPeriodNotOver(uint64 settlementDeadline);
    error PauseNotAllowed();
    error AlreadyPaused(uint64 until);
    error AlreadyClosed();
    error NothingToRefund();

    // ---------------------------------------------------------------------
    // イベント（「お金の記録」画面用）
    // ---------------------------------------------------------------------

    event VaultConfigured(
        bytes32 indexed recruitmentId,
        address indexed asset,
        uint256 goal,
        uint64 fundingDeadline,
        uint64 closeTime,
        uint64 settlementDeadline,
        bytes32 termsHash,
        uint256 disputeResolutionThreshold,
        bool configured
    );
    event LineItemDefined(bytes32 indexed lineItemId, bytes32 labelHash, uint256 cap);
    event Contributed(address indexed contributor, uint256 amount, uint256 contributorTotal, uint256 totalRaised);
    event GoalReached(uint256 totalRaised);
    event ContractProposed(
        bytes32 indexed spendId,
        bytes32 indexed lineItemId,
        address indexed payee,
        uint256 cap,
        bytes32 termsHash,
        address proposer
    );
    event ContractAdoptionApproved(bytes32 indexed spendId, address indexed deliberator, uint256 approvals);
    event ContractRegistered(bytes32 indexed spendId, bytes32 indexed lineItemId, address indexed payee, uint256 cap);
    event InvoiceSubmitted(bytes32 indexed spendId, uint256 round, uint256 amount, bytes32 invoiceHash);
    event SpendConfirmed(bytes32 indexed spendId, address indexed approver, uint256 round, uint256 confirmations);
    event SpendConfirmationComplete(bytes32 indexed spendId, uint256 round, uint64 executableAt);
    event SpendExecuted(bytes32 indexed spendId, address indexed payee, uint256 amount, uint256 releasedFromCap);
    event SpendExpired(bytes32 indexed spendId, uint256 released);
    event DisputeRaised(bytes32 indexed spendId, address indexed by, uint256 round, bytes32 reasonHash);
    event DisputeResolutionApproved(
        bytes32 indexed spendId,
        address indexed resolver,
        uint256 round,
        uint256 approvals,
        bool invoiceRejected,
        bytes32 resolutionHash
    );
    event DisputeResolved(bytes32 indexed spendId, address indexed resolver, bool invoiceRejected, bytes32 resolutionHash);
    event VaultPaused(address indexed by, uint64 until, bytes32 reasonHash);
    event EarlyCloseApproved(address indexed deliberator, uint256 approvals, bytes32 reasonHash);
    event VaultClosedEarly(uint64 closedAt);
    event RefundClaimed(address indexed contributor, uint256 amount, uint256 contributorRefundedTotal);

    // ---------------------------------------------------------------------
    // 固定された条件
    // ---------------------------------------------------------------------

    IERC20 public immutable asset;
    bytes32 public immutable eventId;
    bytes32 public immutable recruitmentId;
    bytes32 public immutable termsHash;
    uint256 public immutable goal;
    uint64 public immutable fundingDeadline;
    uint64 public immutable closeTime;
    uint64 public immutable settlementDeadline;
    uint64 public immutable disputeWindow;
    uint64 public immutable maxPauseDuration;
    uint64 public immutable maxTotalPause;
    uint256 public immutable deliberationThreshold;
    uint256 public immutable approvalThreshold;
    uint256 public immutable disputeResolutionThreshold;
    bool public immutable isConfigured;

    bytes32[] private _lineItemIds;
    mapping(bytes32 => LineItem) private _lineItems;

    address[] private _deliberators;
    address[] private _approvers;
    address[] private _resolvers;
    mapping(address => bool) public isDeliberator;
    mapping(address => bool) public isApprover;
    mapping(address => bool) public isResolver;

    // ---------------------------------------------------------------------
    // 状態
    // ---------------------------------------------------------------------

    uint256 public totalRaised;
    uint256 public totalCommitted; // 登録済み・未払いの契約で拘束中の額
    uint256 public totalPaid;
    uint256 public totalRefunded;
    uint256 public contributorCount;
    mapping(address => uint256) public contributionOf;
    mapping(address => uint256) public refundedOf;

    mapping(bytes32 => Spend) private _spends;
    bytes32[] private _spendIds;
    mapping(bytes32 => mapping(address => bool)) public adoptionApprovedBy;
    mapping(bytes32 => mapping(uint256 => mapping(address => bool))) public confirmedBy;
    mapping(bytes32 => mapping(uint256 => mapping(address => bool))) public resolutionApprovedBy;
    mapping(bytes32 => mapping(uint256 => mapping(address => bytes32))) public resolutionVoteOf;
    mapping(bytes32 => mapping(uint256 => mapping(bytes32 => uint256))) public disputeResolutionVotes;

    uint64 public pausedUntil;
    uint64 public totalPausedDuration;

    uint64 public earlyClosedAt;
    uint256 public earlyCloseApprovals;
    mapping(address => bool) public earlyCloseApprovedBy;

    // ---------------------------------------------------------------------
    // 作成
    // ---------------------------------------------------------------------

    constructor(Config memory cfg) {
        if (address(cfg.asset) == address(0) || address(cfg.asset).code.length == 0) {
            revert InvalidConfig("asset");
        }
        try cfg.asset.balanceOf(address(this)) returns (uint256) {} catch {
            revert InvalidConfig("asset");
        }
        if (cfg.eventId == bytes32(0)) revert InvalidConfig("eventId");
        if (cfg.recruitmentId == bytes32(0)) revert InvalidConfig("recruitmentId");
        if (cfg.termsHash == bytes32(0)) revert InvalidConfig("termsHash");
        if (cfg.goal == 0) revert InvalidConfig("goal");
        if (cfg.fundingDeadline <= block.timestamp) revert InvalidConfig("fundingDeadline");
        if (cfg.closeTime <= cfg.fundingDeadline) revert InvalidConfig("closeTime");
        if (cfg.settlementPeriod == 0) revert InvalidConfig("settlementPeriod");
        if (cfg.disputeWindow == 0) revert InvalidConfig("disputeWindow");
        if (cfg.maxPauseDuration > cfg.maxTotalPause) revert InvalidConfig("pause");

        asset = cfg.asset;
        eventId = cfg.eventId;
        recruitmentId = cfg.recruitmentId;
        termsHash = cfg.termsHash;
        goal = cfg.goal;
        fundingDeadline = cfg.fundingDeadline;
        closeTime = cfg.closeTime;
        settlementDeadline = cfg.closeTime + cfg.settlementPeriod;
        disputeWindow = cfg.disputeWindow;
        maxPauseDuration = cfg.maxPauseDuration;
        maxTotalPause = cfg.maxTotalPause;
        deliberationThreshold = cfg.deliberationThreshold;
        approvalThreshold = cfg.approvalThreshold;
        disputeResolutionThreshold = cfg.disputeResolutionThreshold;

        uint256 capSum;
        for (uint256 i = 0; i < cfg.lineItems.length; i++) {
            LineItemInit memory li = cfg.lineItems[i];
            if (li.id == bytes32(0) || _lineItems[li.id].exists) revert InvalidConfig("lineItem.id");
            if (li.labelHash == bytes32(0)) revert InvalidConfig("lineItem.labelHash");
            if (li.cap == 0) revert InvalidConfig("lineItem.cap");
            _lineItems[li.id] = LineItem({labelHash: li.labelHash, cap: li.cap, committed: 0, spent: 0, exists: true});
            _lineItemIds.push(li.id);
            capSum += li.cap;
            emit LineItemDefined(li.id, li.labelHash, li.cap);
        }
        if (capSum > cfg.goal) revert InvalidConfig("lineItem.capSum");

        for (uint256 i = 0; i < cfg.deliberators.length; i++) {
            address a = cfg.deliberators[i];
            if (a == address(0) || isDeliberator[a]) revert InvalidConfig("deliberators");
            isDeliberator[a] = true;
            _deliberators.push(a);
        }
        for (uint256 i = 0; i < cfg.approvers.length; i++) {
            address a = cfg.approvers[i];
            if (a == address(0) || isApprover[a]) revert InvalidConfig("approvers");
            // 代表者（審議役）が支出確認を兼ねない: 支出の確認は別担当が行う
            if (isDeliberator[a]) revert InvalidConfig("approver is deliberator");
            isApprover[a] = true;
            _approvers.push(a);
        }
        for (uint256 i = 0; i < cfg.disputeResolvers.length; i++) {
            address a = cfg.disputeResolvers[i];
            if (a == address(0) || isResolver[a]) revert InvalidConfig("disputeResolvers");
            // 異議裁定役は審議・支出確認を兼ねず、拠出者にもならない。
            if (isDeliberator[a] || isApprover[a]) revert InvalidConfig("resolver role overlap");
            isResolver[a] = true;
            _resolvers.push(a);
        }

        // 支払条件（使途・確認者・異議裁定数・返金条件）がそろわない募集は「未設定」。拠出を受け付けない。
        isConfigured = cfg.lineItems.length > 0 && cfg.deliberators.length > 0 && cfg.deliberationThreshold > 0
            && cfg.deliberationThreshold <= cfg.deliberators.length && cfg.approvers.length > 0
            && cfg.approvalThreshold > 0 && cfg.approvalThreshold <= cfg.approvers.length
            && cfg.disputeResolvers.length > 0 && cfg.disputeResolutionThreshold > 0
            && cfg.disputeResolutionThreshold <= cfg.disputeResolvers.length;

        emit VaultConfigured(
            cfg.recruitmentId,
            address(cfg.asset),
            cfg.goal,
            cfg.fundingDeadline,
            cfg.closeTime,
            settlementDeadline,
            cfg.termsHash,
            cfg.disputeResolutionThreshold,
            isConfigured
        );
    }

    // ---------------------------------------------------------------------
    // 修飾子
    // ---------------------------------------------------------------------

    modifier onlyDeliberator() {
        if (!isDeliberator[msg.sender]) revert NotDeliberator();
        _;
    }

    modifier onlyApprover() {
        if (!isApprover[msg.sender]) revert NotApprover();
        _;
    }

    modifier onlyResolver() {
        if (!isResolver[msg.sender]) revert NotResolver();
        _;
    }

    modifier whenNotPaused() {
        if (isPaused()) revert Paused(pausedUntil);
        _;
    }

    modifier inPhase(Phase p) {
        Phase cur = phase();
        if (cur != p) revert WrongPhase(cur);
        _;
    }

    // ---------------------------------------------------------------------
    // 拠出
    // ---------------------------------------------------------------------

    /// @notice 共同相談費を拠出する。事前に asset.approve(vault, amount) が必要。
    /// @dev 拠出は議決権・賠償金の取り分を生まない。
    function contribute(uint256 amount) external nonReentrant whenNotPaused {
        if (!isConfigured) revert NotConfigured();
        if (isResolver[msg.sender]) revert ResolverCannotContribute();
        if (block.timestamp >= fundingDeadline || earlyClosedAt != 0) revert FundingClosed();
        if (amount == 0) revert ZeroAmount();
        uint256 remaining = goal - totalRaised;
        if (amount > remaining) revert ExceedsGoal(remaining);

        _transferFromExact(msg.sender, amount);

        if (contributionOf[msg.sender] == 0) contributorCount += 1;
        contributionOf[msg.sender] += amount;
        totalRaised += amount;

        emit Contributed(msg.sender, amount, contributionOf[msg.sender], totalRaised);
        if (totalRaised == goal) emit GoalReached(totalRaised);
    }

    // ---------------------------------------------------------------------
    // 契約の採択（審議役）
    // ---------------------------------------------------------------------

    /// @notice 審議の結果として、支払先・費目・上限・契約条件を提案する（提案者の賛成を含む）。
    function proposeContract(bytes32 spendId, bytes32 lineItemId, address payee, uint256 cap, bytes32 contractTermsHash)
        external
        onlyDeliberator
        whenNotPaused
        inPhase(Phase.Active)
    {
        if (spendId == bytes32(0)) revert InvalidSpendId();
        if (_spends[spendId].status != SpendStatus.None) revert SpendIdAlreadyUsed(spendId);
        if (!_lineItems[lineItemId].exists) revert UnknownLineItem(lineItemId);
        if (payee == address(0) || payee == address(this) || payee == address(asset)) revert InvalidPayee();
        // 自分への支払いを自分で採択・確認・裁定できないよう、受取先は各担当から独立させる
        if (isDeliberator[payee] || isApprover[payee] || isResolver[payee]) revert PayeeNotIndependent();
        if (cap == 0) revert ZeroAmount();
        if (contractTermsHash == bytes32(0)) revert MissingHash();
        _checkCaps(lineItemId, cap);

        Spend storage s = _spends[spendId];
        s.lineItemId = lineItemId;
        s.payee = payee;
        s.cap = cap;
        s.termsHash = contractTermsHash;
        s.status = SpendStatus.Proposed;
        _spendIds.push(spendId);

        emit ContractProposed(spendId, lineItemId, payee, cap, contractTermsHash, msg.sender);
        _approveAdoption(spendId, s);
    }

    /// @notice 提案された契約の採択に賛成する。閾値に達すると上限額が拘束され、登録済みになる。
    function approveContract(bytes32 spendId) external onlyDeliberator whenNotPaused inPhase(Phase.Active) {
        Spend storage s = _spends[spendId];
        if (s.status != SpendStatus.Proposed) revert WrongSpendStatus(s.status);
        _approveAdoption(spendId, s);
    }

    function _approveAdoption(bytes32 spendId, Spend storage s) private {
        if (adoptionApprovedBy[spendId][msg.sender]) revert AlreadyApproved();
        adoptionApprovedBy[spendId][msg.sender] = true;
        s.adoptionApprovals += 1;
        emit ContractAdoptionApproved(spendId, msg.sender, s.adoptionApprovals);

        if (s.adoptionApprovals >= deliberationThreshold) {
            _checkCaps(s.lineItemId, s.cap);
            _lineItems[s.lineItemId].committed += s.cap;
            totalCommitted += s.cap;
            s.status = SpendStatus.Registered;
            emit ContractRegistered(spendId, s.lineItemId, s.payee, s.cap);
        }
    }

    function _checkCaps(bytes32 lineItemId, uint256 cap) private view {
        LineItem storage li = _lineItems[lineItemId];
        uint256 liAvailable = li.cap - li.committed - li.spent;
        if (cap > liAvailable) revert LineItemCapExceeded(liAvailable);
        uint256 totalAvailable = totalRaised - totalCommitted - totalPaid;
        if (cap > totalAvailable) revert TotalCapExceeded(totalAvailable);
    }

    function _transferExact(address recipient, uint256 amount) private {
        uint256 senderBefore = asset.balanceOf(address(this));
        uint256 recipientBefore = asset.balanceOf(recipient);
        asset.safeTransfer(recipient, amount);
        uint256 senderAfter = asset.balanceOf(address(this));
        uint256 recipientAfter = asset.balanceOf(recipient);
        if (
            senderAfter > senderBefore || senderBefore - senderAfter != amount || recipientAfter < recipientBefore
                || recipientAfter - recipientBefore != amount
        ) revert UnexpectedTransferAmount();
    }

    function _transferFromExact(address contributor, uint256 amount) private {
        uint256 vaultBefore = asset.balanceOf(address(this));
        uint256 contributorBefore = asset.balanceOf(contributor);
        asset.safeTransferFrom(contributor, address(this), amount);
        uint256 vaultAfter = asset.balanceOf(address(this));
        uint256 contributorAfter = asset.balanceOf(contributor);
        if (
            vaultAfter < vaultBefore || vaultAfter - vaultBefore != amount || contributorAfter > contributorBefore
                || contributorBefore - contributorAfter != amount
        ) revert UnexpectedTransferAmount();
    }

    // ---------------------------------------------------------------------
    // 請求・確認・支払い
    // ---------------------------------------------------------------------

    /// @notice 受取先が請求する。金額は契約の上限以下。請求書本文はオフチェーンでハッシュのみ記録。
    function submitInvoice(bytes32 spendId, uint256 amount, bytes32 invoiceHash) external {
        Spend storage s = _spends[spendId];
        if (s.status != SpendStatus.Registered) revert WrongSpendStatus(s.status);
        if (msg.sender != s.payee) revert NotPayee();
        if (block.timestamp >= settlementDeadline) revert SettlementPeriodOver();
        if (amount == 0) revert ZeroAmount();
        if (amount > s.cap) revert InvoiceExceedsCap(s.cap);
        if (invoiceHash == bytes32(0)) revert MissingHash();

        s.round += 1;
        s.invoiceAmount = amount;
        s.invoiceHash = invoiceHash;
        s.invoicedAt = uint64(block.timestamp);
        s.confirmations = 0;
        s.confirmedAt = 0;
        s.disputeUsedThisRound = false;
        s.status = SpendStatus.Invoiced;

        emit InvoiceSubmitted(spendId, s.round, amount, invoiceHash);
    }

    /// @notice 支出確認担当が、請求・報告が契約条件を満たすことを確認する。
    function confirm(bytes32 spendId) external onlyApprover {
        Spend storage s = _spends[spendId];
        if (s.status != SpendStatus.Invoiced) revert WrongSpendStatus(s.status);
        if (s.disputed) revert UnderDispute();
        if (block.timestamp >= settlementDeadline) revert SettlementPeriodOver();
        if (confirmedBy[spendId][s.round][msg.sender]) revert AlreadyApproved();

        confirmedBy[spendId][s.round][msg.sender] = true;
        s.confirmations += 1;
        emit SpendConfirmed(spendId, msg.sender, s.round, s.confirmations);

        if (s.confirmations == approvalThreshold) {
            s.confirmedAt = uint64(block.timestamp);
            emit SpendConfirmationComplete(spendId, s.round, s.confirmedAt + disputeWindow);
        }
    }

    /// @notice 条件を満たした支出を、登録済みの受取先へ支払う。誰でも送信できる（金庫は自分から動かない）。
    function execute(bytes32 spendId) external nonReentrant whenNotPaused {
        Spend storage s = _spends[spendId];
        if (s.status != SpendStatus.Invoiced) revert WrongSpendStatus(s.status);
        if (s.confirmations < approvalThreshold) revert ThresholdNotMet(s.confirmations, approvalThreshold);
        if (s.disputed) revert UnderDispute();
        uint64 executableAt = s.confirmedAt + disputeWindow;
        if (block.timestamp < executableAt) revert DisputeWindowOpen(executableAt);
        if (block.timestamp >= settlementDeadline) revert SettlementPeriodOver();

        uint256 amount = s.invoiceAmount;
        uint256 released = s.cap - amount;
        LineItem storage li = _lineItems[s.lineItemId];

        s.status = SpendStatus.Paid;
        li.committed -= s.cap;
        li.spent += amount;
        totalCommitted -= s.cap;
        totalPaid += amount;

        _transferExact(s.payee, amount);
        emit SpendExecuted(spendId, s.payee, amount, released);
    }

    /// @notice 精算期限を過ぎた未払いの契約・提案を期限切れにし、拘束額を返金原資へ戻す。誰でも送信できる。
    function expire(bytes32 spendId) external {
        Spend storage s = _spends[spendId];
        if (block.timestamp < settlementDeadline) revert SettlementPeriodNotOver(settlementDeadline);
        SpendStatus st = s.status;
        if (st != SpendStatus.Proposed && st != SpendStatus.Registered && st != SpendStatus.Invoiced) {
            revert WrongSpendStatus(st);
        }
        uint256 released;
        if (st != SpendStatus.Proposed) {
            released = s.cap;
            _lineItems[s.lineItemId].committed -= s.cap;
            totalCommitted -= s.cap;
        }
        s.status = SpendStatus.Expired;
        s.disputed = false;
        emit SpendExpired(spendId, released);
    }

    // ---------------------------------------------------------------------
    // 異議・期限付き停止
    // ---------------------------------------------------------------------

    /// @notice 請求に異議を申し立てる。拠出者・審議役・支出確認担当が可能。1回の請求につき1回まで。
    function raiseDispute(bytes32 spendId, bytes32 reasonHash) external {
        if (contributionOf[msg.sender] == 0 && !isDeliberator[msg.sender] && !isApprover[msg.sender]) {
            revert NotStakeholder();
        }
        Spend storage s = _spends[spendId];
        if (s.status != SpendStatus.Invoiced) revert WrongSpendStatus(s.status);
        if (s.disputeUsedThisRound) revert DisputeAlreadyUsed();
        if (block.timestamp >= settlementDeadline) revert SettlementPeriodOver();
        // disputeWindow delays execution; objections remain possible until settlementDeadline.
        if (reasonHash == bytes32(0)) revert MissingHash();

        s.disputed = true;
        s.disputeUsedThisRound = true;
        s.disputer = msg.sender;
        emit DisputeRaised(spendId, msg.sender, s.round, reasonHash);
    }

    /// @notice 異議確認担当が裁定に投票する。設定された賛成数に達すると裁定を確定する。
    /// @dev 差し戻し（invoiceRejected=true）なら請求と確認を無効にし、再請求待ちへ戻す。
    function resolveDispute(bytes32 spendId, bool invoiceRejected, bytes32 resolutionHash) external onlyResolver {
        Spend storage s = _spends[spendId];
        if (!s.disputed) revert NotUnderDispute();
        if (msg.sender == s.disputer) revert CannotResolveOwnDispute();
        if (resolutionHash == bytes32(0)) revert MissingHash();

        // 1人1票。裁定結果と根拠ハッシュの組ごとに票を集計し、別案の票を混ぜない。
        if (resolutionApprovedBy[spendId][s.round][msg.sender]) revert ResolutionAlreadyApproved();
        bytes32 resolutionId = keccak256(abi.encode(invoiceRejected, resolutionHash));
        resolutionApprovedBy[spendId][s.round][msg.sender] = true;
        resolutionVoteOf[spendId][s.round][msg.sender] = resolutionId;
        uint256 approvals = ++disputeResolutionVotes[spendId][s.round][resolutionId];
        emit DisputeResolutionApproved(
            spendId, msg.sender, s.round, approvals, invoiceRejected, resolutionHash
        );
        if (approvals < disputeResolutionThreshold) return;

        s.disputed = false;
        if (invoiceRejected) {
            s.status = SpendStatus.Registered;
            s.invoiceAmount = 0;
            s.invoiceHash = bytes32(0);
            s.confirmations = 0;
            s.confirmedAt = 0;
        }
        emit DisputeResolved(spendId, msg.sender, invoiceRejected, resolutionHash);
    }

    /// @notice 期限付き停止。1回の長さと累計に上限があり、期限が来れば自動的に解除される。
    /// @dev 停止中は拠出・契約採択・支払いが止まる。返金請求は止めない。
    function pause(uint64 duration, bytes32 reasonHash) external onlyResolver {
        if (isPaused()) revert AlreadyPaused(pausedUntil);
        if (duration == 0 || duration > maxPauseDuration) revert PauseNotAllowed();
        if (uint256(totalPausedDuration) + duration > maxTotalPause) revert PauseNotAllowed();
        if (reasonHash == bytes32(0)) revert MissingHash();

        totalPausedDuration += duration;
        pausedUntil = uint64(block.timestamp) + duration;
        emit VaultPaused(msg.sender, pausedUntil, reasonHash);
    }

    // ---------------------------------------------------------------------
    // 早期終了・返金
    // ---------------------------------------------------------------------

    /// @notice 審議役が早期終了に賛成する（相談先が見つからない・相談後に見送る等）。閾値で終了。
    /// @dev 目標到達前なら Failed（全額返金）、到達後なら Closed（未拘束残高を按分返金）になる。
    function approveEarlyClose(bytes32 reasonHash) external onlyDeliberator {
        Phase p = phase();
        if (p != Phase.Funding && p != Phase.Active) revert AlreadyClosed();
        if (earlyCloseApprovedBy[msg.sender]) revert AlreadyApproved();
        if (reasonHash == bytes32(0)) revert MissingHash();

        earlyCloseApprovedBy[msg.sender] = true;
        earlyCloseApprovals += 1;
        emit EarlyCloseApproved(msg.sender, earlyCloseApprovals, reasonHash);

        if (earlyCloseApprovals >= deliberationThreshold) {
            earlyClosedAt = uint64(block.timestamp);
            emit VaultClosedEarly(earlyClosedAt);
        }
    }

    /// @notice 本人が返金を請求する。管理者の承認は不要。返金先は msg.sender（拠出した本人）のみ。
    function claimRefund() external nonReentrant returns (uint256 amount) {
        amount = refundableOf(msg.sender);
        if (amount == 0) revert NothingToRefund();
        refundedOf[msg.sender] += amount;
        totalRefunded += amount;
        _transferExact(msg.sender, amount);
        emit RefundClaimed(msg.sender, amount, refundedOf[msg.sender]);
    }

    // ---------------------------------------------------------------------
    // 参照
    // ---------------------------------------------------------------------

    function isPaused() public view returns (bool) {
        return block.timestamp < pausedUntil;
    }

    function goalReached() public view returns (bool) {
        return totalRaised >= goal;
    }

    function phase() public view returns (Phase) {
        if (!isConfigured) return Phase.NotConfigured;
        if (!goalReached()) {
            if (block.timestamp >= fundingDeadline || earlyClosedAt != 0) return Phase.Failed;
            return Phase.Funding;
        }
        if (block.timestamp >= closeTime || earlyClosedAt != 0) return Phase.Closed;
        return Phase.Active;
    }

    /// @notice 未拘束残高（入金合計 − 支払済み − 契約済み未払い）。終了前は返金できるとは限らない。
    function unallocated() public view returns (uint256) {
        return totalRaised - totalPaid - totalCommitted;
    }

    /// @notice 返金原資の累計。Failed なら入金全額、Closed なら未拘束残高。それ以外は 0。
    /// @dev Closed 以降は支払済み＋拘束中の合計が減る一方なので、原資は単調に増える。
    function refundPool() public view returns (uint256) {
        Phase p = phase();
        if (p == Phase.Failed) return totalRaised;
        if (p == Phase.Closed) return unallocated();
        return 0;
    }

    /// @notice 本人が今請求できる返金額（拠出額に比例。端数は切り捨て）。
    /// @dev 人ごとに切り捨てるため、合計の端数（拠出者数未満の最小単位）が残る。管理者用の回収口は設けていない。
    function refundableOf(address contributor) public view returns (uint256) {
        if (totalRaised == 0) return 0;
        uint256 entitled = Math.mulDiv(contributionOf[contributor], refundPool(), totalRaised);
        uint256 already = refundedOf[contributor];
        return entitled > already ? entitled - already : 0;
    }

    function getLineItem(bytes32 lineItemId) external view returns (LineItem memory) {
        return _lineItems[lineItemId];
    }

    function lineItemIds() external view returns (bytes32[] memory) {
        return _lineItemIds;
    }

    function getSpend(bytes32 spendId) external view returns (Spend memory) {
        return _spends[spendId];
    }

    function spendIds() external view returns (bytes32[] memory) {
        return _spendIds;
    }

    function deliberators() external view returns (address[] memory) {
        return _deliberators;
    }

    function approvers() external view returns (address[] memory) {
        return _approvers;
    }

    function disputeResolvers() external view returns (address[] memory) {
        return _resolvers;
    }
}
