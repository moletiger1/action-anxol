// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ConsultationVault} from "../contracts/ConsultationVault.sol";
import {VaultFactory} from "../contracts/VaultFactory.sol";
import {MockUSDC} from "../contracts/mocks/MockUSDC.sol";

/// @dev D02 のデモ数値（目標 2,000 USDC、費目 1,200 / 500 / 200 / 100）に合わせたテスト。
contract ConsultationVaultTest is Test {
    uint256 constant USDC = 1e6;
    uint256 constant GOAL = 2_000 * USDC;

    bytes32 constant RID = keccak256("recruitment:times-001");
    bytes32 constant EVENT_ID = keccak256("event:times-001");
    bytes32 constant TERMS = keccak256("terms-v1");
    bytes32 constant LI_CONSULT = keccak256("line:consultation");
    bytes32 constant LI_RESEARCH = keccak256("line:initial-research");
    bytes32 constant LI_ORGANIZE = keccak256("line:document-organizing");
    bytes32 constant LI_FEES = keccak256("line:fees");

    bytes32 constant SPEND_CONSULT = keccak256("spend:consult-1");
    bytes32 constant SPEND_RESEARCH = keccak256("spend:research-1");
    bytes32 constant H = keccak256("some-document-hash");

    uint64 constant DISPUTE_WINDOW = 3 days;
    uint64 constant MAX_PAUSE = 7 days;
    uint64 constant MAX_TOTAL_PAUSE = 14 days;
    uint64 constant SETTLEMENT = 30 days;

    MockUSDC usdc;
    VaultFactory factory;
    ConsultationVault vault;

    address d1 = makeAddr("deliberator1");
    address d2 = makeAddr("deliberator2");
    address d3 = makeAddr("deliberator3");
    address a1 = makeAddr("approver1");
    address a2 = makeAddr("approver2");
    address r1 = makeAddr("resolver1");
    address r2 = makeAddr("resolver2");
    address lawyer = makeAddr("lawyerA");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address stranger = makeAddr("stranger");

    uint64 fundingDeadline;
    uint64 closeTime;

    function setUp() public {
        vm.warp(1_800_000_000);
        usdc = new MockUSDC();
        factory = new VaultFactory();
        fundingDeadline = uint64(block.timestamp + 30 days);
        closeTime = uint64(block.timestamp + 120 days);
        vault = factory.createVault(_config());

        address[3] memory people = [alice, bob, carol];
        for (uint256 i = 0; i < people.length; i++) {
            usdc.mint(people[i], 10_000 * USDC);
            vm.prank(people[i]);
            usdc.approve(address(vault), type(uint256).max);
        }
    }

    // ------------------------------------------------------------------
    // ヘルパー
    // ------------------------------------------------------------------

    function _config() internal view returns (ConsultationVault.Config memory cfg) {
        cfg.asset = IERC20(address(usdc));
        cfg.eventId = EVENT_ID;
        cfg.recruitmentId = RID;
        cfg.termsHash = TERMS;
        cfg.goal = GOAL;
        cfg.fundingDeadline = fundingDeadline;
        cfg.closeTime = closeTime;
        cfg.settlementPeriod = SETTLEMENT;
        cfg.disputeWindow = DISPUTE_WINDOW;
        cfg.maxPauseDuration = MAX_PAUSE;
        cfg.maxTotalPause = MAX_TOTAL_PAUSE;
        cfg.lineItems = new ConsultationVault.LineItemInit[](4);
        cfg.lineItems[0] = ConsultationVault.LineItemInit(LI_CONSULT, keccak256(unicode"法律相談"), 1_200 * USDC);
        cfg.lineItems[1] = ConsultationVault.LineItemInit(LI_RESEARCH, keccak256(unicode"初期調査"), 500 * USDC);
        cfg.lineItems[2] = ConsultationVault.LineItemInit(LI_ORGANIZE, keccak256(unicode"資料整理"), 200 * USDC);
        cfg.lineItems[3] = ConsultationVault.LineItemInit(LI_FEES, keccak256(unicode"決済等の予備費"), 100 * USDC);
        cfg.deliberators = new address[](3);
        cfg.deliberators[0] = d1;
        cfg.deliberators[1] = d2;
        cfg.deliberators[2] = d3;
        cfg.deliberationThreshold = 2;
        cfg.approvers = new address[](2);
        cfg.approvers[0] = a1;
        cfg.approvers[1] = a2;
        cfg.approvalThreshold = 2;
        cfg.disputeResolvers = new address[](2);
        cfg.disputeResolvers[0] = r1;
        cfg.disputeResolvers[1] = r2;
        cfg.disputeResolutionThreshold = 1;
    }

    function _deploy(ConsultationVault.Config memory cfg) internal returns (ConsultationVault) {
        return new ConsultationVault(cfg);
    }

    function _fundGoal() internal {
        vm.prank(alice);
        vault.contribute(1_000 * USDC);
        vm.prank(bob);
        vault.contribute(600 * USDC);
        vm.prank(carol);
        vault.contribute(400 * USDC);
        assertEq(uint8(vault.phase()), uint8(ConsultationVault.Phase.Active));
    }

    function _register(bytes32 spendId, bytes32 lineItemId, uint256 cap) internal {
        vm.prank(d1);
        vault.proposeContract(spendId, lineItemId, lawyer, cap, keccak256(abi.encode("contract", spendId)));
        vm.prank(d2);
        vault.approveContract(spendId);
    }

    function _invoiceAndConfirm(bytes32 spendId, uint256 amount) internal {
        vm.prank(lawyer);
        vault.submitInvoice(spendId, amount, keccak256(abi.encode("invoice", spendId, amount)));
        vm.prank(a1);
        vault.confirm(spendId);
        vm.prank(a2);
        vault.confirm(spendId);
    }

    function _payConsultation() internal {
        _register(SPEND_CONSULT, LI_CONSULT, 1_200 * USDC);
        _invoiceAndConfirm(SPEND_CONSULT, 1_200 * USDC);
        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vault.execute(SPEND_CONSULT);
    }

    // ------------------------------------------------------------------
    // 作成・設定
    // ------------------------------------------------------------------

    function test_ConfigIsFixedAtCreation() public view {
        assertTrue(vault.isConfigured());
        assertEq(address(vault.asset()), address(usdc));
        assertEq(vault.recruitmentId(), factory.recruitmentKey(address(this), RID));
        assertEq(vault.eventId(), EVENT_ID);
        assertEq(vault.termsHash(), TERMS);
        assertEq(vault.goal(), GOAL);
        assertEq(vault.settlementDeadline(), closeTime + SETTLEMENT);
        assertEq(vault.lineItemIds().length, 4);
        assertEq(vault.getLineItem(LI_RESEARCH).cap, 500 * USDC);
        assertEq(vault.approvers().length, 2);
        assertEq(vault.deliberators().length, 3);
        assertEq(vault.disputeResolvers().length, 2);
        assertEq(uint8(vault.phase()), uint8(ConsultationVault.Phase.Funding));
    }

    function test_NotConfigured_ApprovalThresholdZero_RejectsContribution() public {
        ConsultationVault.Config memory cfg = _config();
        cfg.approvalThreshold = 0;
        _assertUnconfiguredRejects(cfg);
    }

    function test_NotConfigured_ApprovalThresholdAboveApprovers_RejectsContribution() public {
        ConsultationVault.Config memory cfg = _config();
        cfg.approvalThreshold = 3;
        _assertUnconfiguredRejects(cfg);
    }

    function test_NotConfigured_NoApprovers_RejectsContribution() public {
        ConsultationVault.Config memory cfg = _config();
        cfg.approvers = new address[](0);
        cfg.approvalThreshold = 0;
        _assertUnconfiguredRejects(cfg);
    }

    function test_NotConfigured_NoLineItems_RejectsContribution() public {
        ConsultationVault.Config memory cfg = _config();
        cfg.lineItems = new ConsultationVault.LineItemInit[](0);
        _assertUnconfiguredRejects(cfg);
    }

    function test_NotConfigured_NoDeliberationRule_RejectsContribution() public {
        ConsultationVault.Config memory cfg = _config();
        cfg.deliberationThreshold = 4;
        _assertUnconfiguredRejects(cfg);
    }

    function test_NotConfigured_NoDisputeResolver_RejectsContribution() public {
        ConsultationVault.Config memory cfg = _config();
        cfg.disputeResolvers = new address[](0);
        _assertUnconfiguredRejects(cfg);
    }

    function _assertUnconfiguredRejects(ConsultationVault.Config memory cfg) internal {
        ConsultationVault v = _deploy(cfg);
        assertFalse(v.isConfigured());
        assertEq(uint8(v.phase()), uint8(ConsultationVault.Phase.NotConfigured));
        vm.startPrank(alice);
        usdc.approve(address(v), type(uint256).max);
        vm.expectRevert(ConsultationVault.NotConfigured.selector);
        v.contribute(10 * USDC);
        vm.stopPrank();
        assertEq(usdc.balanceOf(address(v)), 0);
    }

    function test_RevertWhen_InvalidConfig() public {
        ConsultationVault.Config memory cfg;

        cfg = _config();
        cfg.lineItems[3].cap = 101 * USDC; // 費目の合計が目標を超える
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.InvalidConfig.selector, "lineItem.capSum"));
        _deploy(cfg);

        cfg = _config();
        cfg.lineItems[1].id = LI_CONSULT; // 費目IDの重複
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.InvalidConfig.selector, "lineItem.id"));
        _deploy(cfg);

        cfg = _config();
        cfg.fundingDeadline = uint64(block.timestamp); // 期限が過去
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.InvalidConfig.selector, "fundingDeadline"));
        _deploy(cfg);

        cfg = _config();
        cfg.approvers[1] = a1; // 確認担当の重複（同一人物で閾値を満たせない）
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.InvalidConfig.selector, "approvers"));
        _deploy(cfg);

        cfg = _config();
        cfg.approvers[1] = d1; // 審議役が確認担当を兼ねる
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.InvalidConfig.selector, "approver is deliberator"));
        _deploy(cfg);

        cfg = _config();
        cfg.maxPauseDuration = MAX_TOTAL_PAUSE + 1;
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.InvalidConfig.selector, "pause"));
        _deploy(cfg);

        cfg = _config();
        cfg.asset = IERC20(address(0));
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.InvalidConfig.selector, "asset"));
        _deploy(cfg);
    }

    // ------------------------------------------------------------------
    // 拠出
    // ------------------------------------------------------------------

    function test_Contribute_TracksPerContributor() public {
        vm.prank(alice);
        vault.contribute(100 * USDC);
        vm.prank(alice);
        vault.contribute(50 * USDC);
        vm.prank(bob);
        vault.contribute(10 * USDC);

        assertEq(vault.contributionOf(alice), 150 * USDC);
        assertEq(vault.contributionOf(bob), 10 * USDC);
        assertEq(vault.totalRaised(), 160 * USDC);
        assertEq(vault.contributorCount(), 2);
        assertEq(usdc.balanceOf(address(vault)), 160 * USDC);
    }

    function test_RevertWhen_ContributeZero() public {
        vm.prank(alice);
        vm.expectRevert(ConsultationVault.ZeroAmount.selector);
        vault.contribute(0);
    }

    function test_RevertWhen_ContributeAboveGoal() public {
        vm.prank(alice);
        vault.contribute(1_900 * USDC);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.ExceedsGoal.selector, 100 * USDC));
        vault.contribute(100 * USDC + 1);
    }

    function test_RevertWhen_ContributeAfterDeadline() public {
        vm.warp(fundingDeadline);
        vm.prank(alice);
        vm.expectRevert(ConsultationVault.FundingClosed.selector);
        vault.contribute(1 * USDC);
    }

    function test_RevertWhen_ContributeWhilePaused() public {
        vm.prank(r1);
        vault.pause(1 days, H);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.Paused.selector, uint64(block.timestamp + 1 days)));
        vault.contribute(1 * USDC);
    }

    function test_ContributionGivesNoPower() public {
        _fundGoal();
        // 最大の拠出者でも契約の提案・採択・確認・停止はできない
        vm.startPrank(alice);
        vm.expectRevert(ConsultationVault.NotDeliberator.selector);
        vault.proposeContract(SPEND_CONSULT, LI_CONSULT, lawyer, 1 * USDC, H);
        vm.expectRevert(ConsultationVault.NotApprover.selector);
        vault.confirm(SPEND_CONSULT);
        vm.expectRevert(ConsultationVault.NotResolver.selector);
        vault.pause(1 days, H);
        vm.expectRevert(ConsultationVault.NotDeliberator.selector);
        vault.approveEarlyClose(H);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // 目標未達 → 全額返金
    // ------------------------------------------------------------------

    function test_GoalNotMet_FullRefundByContributorThemselves() public {
        vm.prank(alice);
        vault.contribute(300 * USDC);
        vm.prank(bob);
        vault.contribute(200 * USDC);

        // 期限前は返金できない
        vm.prank(alice);
        vm.expectRevert(ConsultationVault.NothingToRefund.selector);
        vault.claimRefund();

        vm.warp(fundingDeadline);
        assertEq(uint8(vault.phase()), uint8(ConsultationVault.Phase.Failed));
        assertEq(vault.refundableOf(alice), 300 * USDC);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.claimRefund();
        assertEq(usdc.balanceOf(alice) - before, 300 * USDC);

        vm.prank(alice);
        vm.expectRevert(ConsultationVault.NothingToRefund.selector);
        vault.claimRefund();

        vm.prank(stranger);
        vm.expectRevert(ConsultationVault.NothingToRefund.selector);
        vault.claimRefund();

        vm.prank(bob);
        vault.claimRefund();
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_RevertWhen_SpendingBeforeGoalOrAfterFailure() public {
        vm.prank(alice);
        vault.contribute(300 * USDC);
        vm.prank(d1);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.WrongPhase.selector, ConsultationVault.Phase.Funding));
        vault.proposeContract(SPEND_CONSULT, LI_CONSULT, lawyer, 100 * USDC, H);

        vm.warp(fundingDeadline);
        vm.prank(d1);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.WrongPhase.selector, ConsultationVault.Phase.Failed));
        vault.proposeContract(SPEND_CONSULT, LI_CONSULT, lawyer, 100 * USDC, H);
    }

    // ------------------------------------------------------------------
    // 契約の採択
    // ------------------------------------------------------------------

    function test_ContractRequiresDeliberationThreshold() public {
        _fundGoal();
        vm.prank(d1);
        vault.proposeContract(SPEND_CONSULT, LI_CONSULT, lawyer, 1_200 * USDC, H);
        assertEq(uint8(vault.getSpend(SPEND_CONSULT).status), uint8(ConsultationVault.SpendStatus.Proposed));
        assertEq(vault.totalCommitted(), 0);

        // 提案者が二重に賛成しても閾値に届かない
        vm.prank(d1);
        vm.expectRevert(ConsultationVault.AlreadyApproved.selector);
        vault.approveContract(SPEND_CONSULT);

        // 採択前の請求は不可
        vm.prank(lawyer);
        vm.expectRevert(
            abi.encodeWithSelector(ConsultationVault.WrongSpendStatus.selector, ConsultationVault.SpendStatus.Proposed)
        );
        vault.submitInvoice(SPEND_CONSULT, 1 * USDC, H);

        vm.prank(d2);
        vault.approveContract(SPEND_CONSULT);
        ConsultationVault.Spend memory s = vault.getSpend(SPEND_CONSULT);
        assertEq(uint8(s.status), uint8(ConsultationVault.SpendStatus.Registered));
        assertEq(s.payee, lawyer);
        assertEq(vault.totalCommitted(), 1_200 * USDC);
        assertEq(vault.getLineItem(LI_CONSULT).committed, 1_200 * USDC);
        assertEq(vault.unallocated(), 800 * USDC);
    }

    function test_RevertWhen_PayeeNotIndependentOrInvalid() public {
        _fundGoal();
        address[5] memory bad = [d2, a1, r1, address(0), address(vault)];
        for (uint256 i = 0; i < bad.length; i++) {
            vm.prank(d1);
            vm.expectRevert();
            vault.proposeContract(bytes32(i + 1), LI_CONSULT, bad[i], 1 * USDC, H);
        }
        vm.prank(d1);
        vm.expectRevert(ConsultationVault.PayeeNotIndependent.selector);
        vault.proposeContract(SPEND_CONSULT, LI_CONSULT, a1, 1 * USDC, H);
    }

    function test_RevertWhen_LineItemCapExceeded() public {
        _fundGoal();
        vm.prank(d1);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.LineItemCapExceeded.selector, 500 * USDC));
        vault.proposeContract(SPEND_RESEARCH, LI_RESEARCH, lawyer, 500 * USDC + 1, H);

        // 2件に分けても費目の上限は超えられない
        _register(keccak256("r-a"), LI_RESEARCH, 300 * USDC);
        vm.prank(d1);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.LineItemCapExceeded.selector, 200 * USDC));
        vault.proposeContract(keccak256("r-b"), LI_RESEARCH, lawyer, 201 * USDC, H);
    }

    function test_RevertWhen_TotalCapExceeded() public {
        // 費目の合計（1,200）が目標（2,000）未満でも、実際の入金額を超えて拘束できない
        ConsultationVault.Config memory cfg = _config();
        cfg.goal = 1_000 * USDC;
        cfg.lineItems = new ConsultationVault.LineItemInit[](1);
        cfg.lineItems[0] = ConsultationVault.LineItemInit(LI_CONSULT, H, 1_000 * USDC);
        ConsultationVault v = _deploy(cfg);
        vm.startPrank(alice);
        usdc.approve(address(v), type(uint256).max);
        v.contribute(1_000 * USDC);
        vm.stopPrank();

        vm.prank(d1);
        v.proposeContract(keccak256("x"), LI_CONSULT, lawyer, 600 * USDC, H);
        vm.prank(d2);
        v.approveContract(keccak256("x"));
        vm.prank(d1);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.LineItemCapExceeded.selector, 400 * USDC));
        v.proposeContract(keccak256("y"), LI_CONSULT, lawyer, 401 * USDC, H);
    }

    function test_RevertWhen_UnknownLineItem() public {
        _fundGoal();
        vm.prank(d1);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.UnknownLineItem.selector, keccak256("nope")));
        vault.proposeContract(SPEND_CONSULT, keccak256("nope"), lawyer, 1 * USDC, H);
    }

    function test_RevertWhen_SpendIdReused() public {
        _fundGoal();
        _payConsultation();
        // 支払済みの支出IDは再利用できない
        vm.prank(d1);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.SpendIdAlreadyUsed.selector, SPEND_CONSULT));
        vault.proposeContract(SPEND_CONSULT, LI_RESEARCH, lawyer, 1 * USDC, H);

        // 提案中の支出IDも再利用できない
        vm.prank(d1);
        vault.proposeContract(SPEND_RESEARCH, LI_RESEARCH, lawyer, 100 * USDC, H);
        vm.prank(d3);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.SpendIdAlreadyUsed.selector, SPEND_RESEARCH));
        vault.proposeContract(SPEND_RESEARCH, LI_RESEARCH, lawyer, 50 * USDC, H);
    }

    function test_RevertWhen_NonDeliberatorProposes() public {
        _fundGoal();
        vm.prank(stranger);
        vm.expectRevert(ConsultationVault.NotDeliberator.selector);
        vault.proposeContract(SPEND_CONSULT, LI_CONSULT, lawyer, 1 * USDC, H);
    }

    // ------------------------------------------------------------------
    // 請求 → 確認 → 支払い
    // ------------------------------------------------------------------

    function test_FullSpendLifecycle_D02Numbers() public {
        _fundGoal();
        _payConsultation();
        assertEq(usdc.balanceOf(lawyer), 1_200 * USDC);
        assertEq(vault.totalPaid(), 1_200 * USDC);

        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);
        vm.prank(lawyer);
        vault.submitInvoice(SPEND_RESEARCH, 500 * USDC, H);
        vm.prank(a1);
        vault.confirm(SPEND_RESEARCH);

        // D02 の状態: 入金 2,000 / 支払済み 1,200 / 契約済み未払い 500 / 未拘束 300
        assertEq(vault.totalRaised(), 2_000 * USDC);
        assertEq(vault.totalPaid(), 1_200 * USDC);
        assertEq(vault.totalCommitted(), 500 * USDC);
        assertEq(vault.unallocated(), 300 * USDC);
        // 未拘束残高があっても、終了前は返金できない
        assertEq(vault.refundableOf(alice), 0);

        // 確認 1／2 では支払えない
        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.ThresholdNotMet.selector, 1, 2));
        vault.execute(SPEND_RESEARCH);

        vm.prank(a2);
        vault.confirm(SPEND_RESEARCH);
        // 確認が揃っても、異議受付期間中は支払えない
        vm.expectRevert(
            abi.encodeWithSelector(ConsultationVault.DisputeWindowOpen.selector, uint64(block.timestamp + DISPUTE_WINDOW))
        );
        vault.execute(SPEND_RESEARCH);

        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vm.prank(stranger); // 誰が送信しても、支払先は登録済みの受取先だけ
        vault.execute(SPEND_RESEARCH);
        assertEq(usdc.balanceOf(lawyer), 1_700 * USDC);
        assertEq(usdc.balanceOf(stranger), 0);

        vm.expectRevert(
            abi.encodeWithSelector(ConsultationVault.WrongSpendStatus.selector, ConsultationVault.SpendStatus.Paid)
        );
        vault.execute(SPEND_RESEARCH);
    }

    function test_RevertWhen_InvoiceByNonPayeeOrAboveCap() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);

        vm.prank(stranger);
        vm.expectRevert(ConsultationVault.NotPayee.selector);
        vault.submitInvoice(SPEND_RESEARCH, 500 * USDC, H);

        vm.prank(lawyer);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.InvoiceExceedsCap.selector, 500 * USDC));
        vault.submitInvoice(SPEND_RESEARCH, 500 * USDC + 1, H);

        vm.prank(lawyer);
        vm.expectRevert(ConsultationVault.MissingHash.selector);
        vault.submitInvoice(SPEND_RESEARCH, 500 * USDC, bytes32(0));

        vm.prank(lawyer);
        vault.submitInvoice(SPEND_RESEARCH, 400 * USDC, H);
        vm.prank(lawyer);
        vm.expectRevert(
            abi.encodeWithSelector(ConsultationVault.WrongSpendStatus.selector, ConsultationVault.SpendStatus.Invoiced)
        );
        vault.submitInvoice(SPEND_RESEARCH, 500 * USDC, H);
    }

    function test_RevertWhen_ConfirmInvalid() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);

        // 請求前の確認は不可
        vm.prank(a1);
        vm.expectRevert(
            abi.encodeWithSelector(ConsultationVault.WrongSpendStatus.selector, ConsultationVault.SpendStatus.Registered)
        );
        vault.confirm(SPEND_RESEARCH);

        vm.prank(lawyer);
        vault.submitInvoice(SPEND_RESEARCH, 500 * USDC, H);

        vm.prank(d1);
        vm.expectRevert(ConsultationVault.NotApprover.selector);
        vault.confirm(SPEND_RESEARCH);

        vm.prank(lawyer);
        vm.expectRevert(ConsultationVault.NotApprover.selector);
        vault.confirm(SPEND_RESEARCH);

        vm.prank(a1);
        vault.confirm(SPEND_RESEARCH);
        vm.prank(a1);
        vm.expectRevert(ConsultationVault.AlreadyApproved.selector);
        vault.confirm(SPEND_RESEARCH);
    }

    function test_RevertWhen_ExecuteWithoutConfirmation() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);
        vm.expectRevert(
            abi.encodeWithSelector(ConsultationVault.WrongSpendStatus.selector, ConsultationVault.SpendStatus.Registered)
        );
        vault.execute(SPEND_RESEARCH);

        vm.prank(lawyer);
        vault.submitInvoice(SPEND_RESEARCH, 500 * USDC, H);
        vm.warp(block.timestamp + 10 days);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.ThresholdNotMet.selector, 0, 2));
        vault.execute(SPEND_RESEARCH);
        assertEq(usdc.balanceOf(lawyer), 0);
    }

    function test_PartialInvoice_ReleasesRemainderOfCap() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);
        _invoiceAndConfirm(SPEND_RESEARCH, 420 * USDC);
        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vault.execute(SPEND_RESEARCH);

        assertEq(usdc.balanceOf(lawyer), 420 * USDC);
        assertEq(vault.totalCommitted(), 0);
        assertEq(vault.getLineItem(LI_RESEARCH).spent, 420 * USDC);
        assertEq(vault.unallocated(), 1_580 * USDC);
        // 残り 80 は同じ費目内で再利用できる
        _register(keccak256("research-2"), LI_RESEARCH, 80 * USDC);
    }

    // ------------------------------------------------------------------
    // 異議
    // ------------------------------------------------------------------

    function test_Dispute_BlocksExecution_DismissThenPay() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);
        _invoiceAndConfirm(SPEND_RESEARCH, 500 * USDC);

        vm.prank(stranger);
        vm.expectRevert(ConsultationVault.NotStakeholder.selector);
        vault.raiseDispute(SPEND_RESEARCH, H);

        vm.prank(carol); // 拠出者
        vault.raiseDispute(SPEND_RESEARCH, keccak256(unicode"調査範囲が契約と異なる"));

        vm.warp(block.timestamp + DISPUTE_WINDOW + 1 days);
        vm.expectRevert(ConsultationVault.UnderDispute.selector);
        vault.execute(SPEND_RESEARCH);

        // 同じ請求への二度目の異議は不可（無期限拘束の防止）
        vm.prank(bob);
        vm.expectRevert(ConsultationVault.DisputeAlreadyUsed.selector);
        vault.raiseDispute(SPEND_RESEARCH, H);

        vm.prank(stranger);
        vm.expectRevert(ConsultationVault.NotResolver.selector);
        vault.resolveDispute(SPEND_RESEARCH, false, H);

        vm.prank(r1);
        vault.resolveDispute(SPEND_RESEARCH, false, keccak256(unicode"契約の範囲内と確認"));
        vault.execute(SPEND_RESEARCH);
        assertEq(usdc.balanceOf(lawyer), 500 * USDC);
    }

    function test_Dispute_RejectInvoice_VoidsConfirmations() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);
        _invoiceAndConfirm(SPEND_RESEARCH, 500 * USDC);

        vm.prank(a1); // 確認担当も異議を出せる
        vault.raiseDispute(SPEND_RESEARCH, H);
        vm.prank(r2);
        vault.resolveDispute(SPEND_RESEARCH, true, keccak256(unicode"報告書が未提出"));

        ConsultationVault.Spend memory s = vault.getSpend(SPEND_RESEARCH);
        assertEq(uint8(s.status), uint8(ConsultationVault.SpendStatus.Registered));
        assertEq(s.confirmations, 0);
        assertEq(vault.totalCommitted(), 500 * USDC); // 契約の拘束は残る

        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vm.expectRevert(
            abi.encodeWithSelector(ConsultationVault.WrongSpendStatus.selector, ConsultationVault.SpendStatus.Registered)
        );
        vault.execute(SPEND_RESEARCH);

        // 再請求。旧い確認は無効なので、改めて閾値分の確認が必要
        vm.prank(lawyer);
        vault.submitInvoice(SPEND_RESEARCH, 450 * USDC, H);
        assertEq(vault.getSpend(SPEND_RESEARCH).round, 2);
        vm.prank(a1);
        vault.confirm(SPEND_RESEARCH);
        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.ThresholdNotMet.selector, 1, 2));
        vault.execute(SPEND_RESEARCH);
        vm.prank(a2);
        vault.confirm(SPEND_RESEARCH);
        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vault.execute(SPEND_RESEARCH);
        assertEq(usdc.balanceOf(lawyer), 450 * USDC);
    }

    function test_ResolverCannotContributeAndCanResolveOtherDispute() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);
        _invoiceAndConfirm(SPEND_RESEARCH, 500 * USDC);

        vm.prank(r1);
        vm.expectRevert(ConsultationVault.ResolverCannotContribute.selector);
        vault.contribute(1);
        vm.prank(r1);
        vm.expectRevert(ConsultationVault.NotStakeholder.selector);
        vault.raiseDispute(SPEND_RESEARCH, H);

        vm.prank(alice);
        vault.raiseDispute(SPEND_RESEARCH, H);
        vm.prank(r1);
        vault.resolveDispute(SPEND_RESEARCH, false, keccak256("independent ruling"));
    }

    function test_RevertWhen_ConfirmWhileDisputed() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);
        vm.prank(lawyer);
        vault.submitInvoice(SPEND_RESEARCH, 500 * USDC, H);
        vm.prank(alice);
        vault.raiseDispute(SPEND_RESEARCH, H);
        vm.prank(a1);
        vm.expectRevert(ConsultationVault.UnderDispute.selector);
        vault.confirm(SPEND_RESEARCH);
    }

    // ------------------------------------------------------------------
    // 期限付き停止
    // ------------------------------------------------------------------

    function test_Pause_BlocksPayment_AndExpiresAutomatically() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);
        _invoiceAndConfirm(SPEND_RESEARCH, 500 * USDC);

        vm.prank(r1);
        vault.pause(5 days, keccak256(unicode"異議の確認のため"));
        assertTrue(vault.isPaused());

        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.Paused.selector, vault.pausedUntil()));
        vault.execute(SPEND_RESEARCH);

        // 停止中の契約採択も不可
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.Paused.selector, vault.pausedUntil()));
        vm.prank(d1);
        vault.proposeContract(keccak256("z"), LI_ORGANIZE, lawyer, 1 * USDC, H);

        // 停止の延長・重ねがけは不可
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.AlreadyPaused.selector, vault.pausedUntil()));
        vm.prank(r2);
        vault.pause(1 days, H);

        vm.warp(vault.pausedUntil()); // 解除の取引は不要
        assertFalse(vault.isPaused());
        vault.execute(SPEND_RESEARCH);
        assertEq(usdc.balanceOf(lawyer), 500 * USDC);
    }

    function test_RevertWhen_PauseTooLongOrOverTotal() public {
        vm.prank(stranger);
        vm.expectRevert(ConsultationVault.NotResolver.selector);
        vault.pause(1 days, H);

        vm.prank(r1);
        vm.expectRevert(ConsultationVault.PauseNotAllowed.selector);
        vault.pause(MAX_PAUSE + 1, H);

        vm.prank(r1);
        vm.expectRevert(ConsultationVault.PauseNotAllowed.selector);
        vault.pause(0, H);

        vm.prank(r1);
        vault.pause(MAX_PAUSE, H);
        vm.warp(block.timestamp + MAX_PAUSE);
        vm.prank(r2);
        vault.pause(MAX_PAUSE, H);
        vm.warp(block.timestamp + MAX_PAUSE);
        // 累計上限（14日）を使い切ったので、これ以上は停止できない
        vm.prank(r1);
        vm.expectRevert(ConsultationVault.PauseNotAllowed.selector);
        vault.pause(1, H);
    }

    function test_Pause_DoesNotBlockRefunds() public {
        vm.prank(alice);
        vault.contribute(100 * USDC);
        vm.warp(fundingDeadline - 1 days);
        vm.prank(r1);
        vault.pause(MAX_PAUSE, H);
        vm.warp(fundingDeadline);
        assertTrue(vault.isPaused());
        vm.prank(alice);
        vault.claimRefund();
        assertEq(vault.refundedOf(alice), 100 * USDC);
    }

    // ------------------------------------------------------------------
    // 終了後の按分返金
    // ------------------------------------------------------------------

    function test_AfterClose_ProRataRefundOfUnallocated() public {
        _fundGoal(); // alice 1,000 / bob 600 / carol 400
        _payConsultation(); // 1,200 支払済み
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC); // 500 拘束中

        // 終了前は、未拘束 300 があっても返金できない
        vm.prank(alice);
        vm.expectRevert(ConsultationVault.NothingToRefund.selector);
        vault.claimRefund();

        vm.warp(closeTime);
        assertEq(uint8(vault.phase()), uint8(ConsultationVault.Phase.Closed));
        assertEq(vault.refundPool(), 300 * USDC);
        assertEq(vault.refundableOf(alice), 150 * USDC);
        assertEq(vault.refundableOf(bob), 90 * USDC);
        assertEq(vault.refundableOf(carol), 60 * USDC);

        // 終了後は新しい契約を登録できない
        vm.prank(d1);
        vm.expectRevert(abi.encodeWithSelector(ConsultationVault.WrongPhase.selector, ConsultationVault.Phase.Closed));
        vault.proposeContract(keccak256("late"), LI_ORGANIZE, lawyer, 1 * USDC, H);

        vm.prank(alice);
        vault.claimRefund();
        assertEq(vault.refundedOf(alice), 150 * USDC);

        // 登録済み契約は精算期限までは支払える。上限 500 のうち 400 を支払い、100 が返金原資に戻る
        _invoiceAndConfirm(SPEND_RESEARCH, 400 * USDC);
        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vault.execute(SPEND_RESEARCH);
        assertEq(vault.refundPool(), 400 * USDC);
        assertEq(vault.refundableOf(alice), 50 * USDC); // 200 − 既返金 150
        assertEq(vault.refundableOf(bob), 120 * USDC);

        vm.prank(alice);
        vault.claimRefund();
        vm.prank(bob);
        vault.claimRefund();
        vm.prank(carol);
        vault.claimRefund();
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(vault.totalRefunded(), 400 * USDC);
    }

    function test_AfterSettlementDeadline_ExpireReleasesCommitment() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);

        vm.warp(closeTime);
        vm.expectRevert(
            abi.encodeWithSelector(ConsultationVault.SettlementPeriodNotOver.selector, vault.settlementDeadline())
        );
        vault.expire(SPEND_RESEARCH);
        assertEq(vault.refundPool(), 1_500 * USDC);

        vm.warp(vault.settlementDeadline());
        vm.prank(lawyer);
        vm.expectRevert(ConsultationVault.SettlementPeriodOver.selector);
        vault.submitInvoice(SPEND_RESEARCH, 500 * USDC, H);

        vm.prank(stranger); // 誰でも送信できる
        vault.expire(SPEND_RESEARCH);
        assertEq(vault.totalCommitted(), 0);
        assertEq(vault.refundPool(), 2_000 * USDC);
        assertEq(vault.refundableOf(alice), 1_000 * USDC);

        vm.expectRevert(
            abi.encodeWithSelector(ConsultationVault.WrongSpendStatus.selector, ConsultationVault.SpendStatus.Expired)
        );
        vault.expire(SPEND_RESEARCH);
    }

    function test_RevertWhen_ExecuteAfterSettlementDeadline() public {
        _fundGoal();
        _register(SPEND_RESEARCH, LI_RESEARCH, 500 * USDC);
        _invoiceAndConfirm(SPEND_RESEARCH, 500 * USDC);
        vm.warp(vault.settlementDeadline());
        vm.expectRevert(ConsultationVault.SettlementPeriodOver.selector);
        vault.execute(SPEND_RESEARCH);
    }

    // ------------------------------------------------------------------
    // 早期終了
    // ------------------------------------------------------------------

    function test_EarlyClose_AfterGoal_RequiresThreshold() public {
        _fundGoal();
        _payConsultation();

        vm.prank(d1);
        vault.approveEarlyClose(keccak256(unicode"相談の結果、見送り"));
        assertEq(uint8(vault.phase()), uint8(ConsultationVault.Phase.Active));
        vm.prank(d1);
        vm.expectRevert(ConsultationVault.AlreadyApproved.selector);
        vault.approveEarlyClose(H);

        vm.prank(d3);
        vault.approveEarlyClose(H);
        assertEq(uint8(vault.phase()), uint8(ConsultationVault.Phase.Closed));
        assertEq(vault.refundableOf(alice), 400 * USDC); // 800 × 1,000 / 2,000

        vm.prank(d2);
        vm.expectRevert(ConsultationVault.AlreadyClosed.selector);
        vault.approveEarlyClose(H);
    }

    function test_EarlyClose_BeforeGoal_FullRefund_NoMoreContributions() public {
        vm.prank(alice);
        vault.contribute(500 * USDC);
        vm.prank(d1);
        vault.approveEarlyClose(H);
        vm.prank(d2);
        vault.approveEarlyClose(H);
        assertEq(uint8(vault.phase()), uint8(ConsultationVault.Phase.Failed));

        vm.prank(bob);
        vm.expectRevert(ConsultationVault.FundingClosed.selector);
        vault.contribute(1 * USDC);

        vm.prank(alice);
        vault.claimRefund();
        assertEq(usdc.balanceOf(alice), 10_000 * USDC);
    }

    // ------------------------------------------------------------------
    // 管理者による出金経路がないこと
    // ------------------------------------------------------------------

    function test_NoArbitraryTransferEntryPoints() public {
        _fundGoal();
        bytes[4] memory calls = [
            abi.encodeWithSignature("withdraw(address,uint256)", stranger, GOAL),
            abi.encodeWithSignature("transfer(address,uint256)", stranger, GOAL),
            abi.encodeWithSignature("sweep(address)", stranger),
            abi.encodeWithSignature("setApprovers(address[])", new address[](0))
        ];
        for (uint256 i = 0; i < calls.length; i++) {
            (bool ok,) = address(vault).call(calls[i]);
            assertFalse(ok);
        }
        (bool sent,) = address(vault).call{value: 1}("");
        assertFalse(sent);
        assertEq(usdc.balanceOf(address(vault)), GOAL);
    }

    // ------------------------------------------------------------------
    // 工場
    // ------------------------------------------------------------------

    function test_Factory_RecordsOneVaultPerRecruitment() public {
        bytes32 key = factory.recruitmentKey(address(this), RID);
        assertEq(factory.vaultOf(key), address(vault));
        assertTrue(factory.eventRegistered(EVENT_ID));
        assertEq(factory.vaultsForEvent(EVENT_ID).length, 1);
        assertTrue(factory.isVault(address(vault)));
        assertEq(factory.vaultCount(), 1);

        vm.expectRevert(abi.encodeWithSelector(VaultFactory.RecruitmentIdTaken.selector, key, address(vault)));
        factory.createVault(_config());

        ConsultationVault.Config memory other = _config();
        other.recruitmentId = keccak256("recruitment:other");
        vm.prank(bob);
        ConsultationVault v2 = factory.createVault(other);
        assertTrue(address(v2) != address(vault));
        assertEq(factory.vaultsForEvent(EVENT_ID).length, 2);
        // 資金は募集ごとに分離
        vm.prank(alice);
        vault.contribute(10 * USDC);
        assertEq(v2.totalRaised(), 0);
        assertEq(usdc.balanceOf(address(v2)), 0);
    }

    function test_Factory_UnconfiguredVaultReplaceableOnlyByCreator() public {
        bytes32 rid = keccak256("recruitment:draft");
        ConsultationVault.Config memory cfg = _config();
        cfg.recruitmentId = rid;
        cfg.approvalThreshold = 0;

        vm.prank(bob);
        ConsultationVault draft = factory.createVault(cfg);
        assertFalse(draft.isConfigured());

        bytes32 bobKey = factory.recruitmentKey(bob, rid);
        vm.prank(stranger);
        ConsultationVault strangerDraft = factory.createVault(cfg);
        assertFalse(strangerDraft.isConfigured());
        assertTrue(address(strangerDraft) != address(draft));

        cfg.approvalThreshold = 2;
        vm.prank(bob);
        ConsultationVault fixedVault = factory.createVault(cfg);
        assertTrue(fixedVault.isConfigured());
        assertEq(factory.vaultOf(bobKey), address(fixedVault));

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(VaultFactory.RecruitmentIdTaken.selector, bobKey, address(fixedVault)));
        factory.createVault(cfg);
    }

    // ------------------------------------------------------------------
    // ファズ: 按分返金の合計は原資を超えず、金庫は常に支払能力を保つ
    // ------------------------------------------------------------------

    function testFuzz_RefundsNeverExceedPool(uint96 x, uint96 y, uint96 paid) public {
        uint256 ax = bound(uint256(x), 1, GOAL - 2);
        uint256 by = bound(uint256(y), 1, GOAL - ax - 1);
        uint256 cz = GOAL - ax - by;
        uint256 spend = bound(uint256(paid), 1, 1_200 * USDC);

        vm.prank(alice);
        vault.contribute(ax);
        vm.prank(bob);
        vault.contribute(by);
        vm.prank(carol);
        vault.contribute(cz);

        _register(SPEND_CONSULT, LI_CONSULT, 1_200 * USDC);
        _invoiceAndConfirm(SPEND_CONSULT, spend);
        vm.warp(block.timestamp + DISPUTE_WINDOW);
        vault.execute(SPEND_CONSULT);
        vm.warp(closeTime);

        uint256 pool = vault.refundPool();
        assertEq(pool, GOAL - spend);
        uint256 sum;
        address[3] memory people = [alice, bob, carol];
        for (uint256 i = 0; i < 3; i++) {
            uint256 r = vault.refundableOf(people[i]);
            if (r > 0) {
                vm.prank(people[i]);
                vault.claimRefund();
            }
            sum += r;
        }
        assertLe(sum, pool);
        assertLe(pool - sum, 3); // 端数は最大でも拠出者数未満
        assertEq(usdc.balanceOf(address(vault)), pool - sum);
    }
}
