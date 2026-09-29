// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ConsultationVault} from "./ConsultationVault.sol";

/// @title VaultFactory（募集ごとの金庫を作る工場）
/// @notice デモ用。事件IDに複数の募集案を紐付け、作成者ごとの募集IDにつき1つの ConsultationVault を作る。
/// @dev 所有者・管理者はいない。工場は資金に触れず、作成済み金庫の条件も変更できない。
///      呼び出し元と入力IDから募集IDを導出するため、他の作成者がIDを先取りして募集案を塞げない。
///      eventId は共有キーであり現実の事件の同一性を証明しない。異なるIDの統合・異議裁定は未実装。
contract VaultFactory {
    error InvalidEventId();
    error InvalidRecruitmentId();
    error RecruitmentIdTaken(bytes32 recruitmentId, address vault);
    error RecruitmentEventMismatch(bytes32 currentEventId, bytes32 requestedEventId);

    event VaultCreated(
        bytes32 indexed recruitmentId, address indexed vault, address indexed creator, bool configured, address replaced
    );
    event EventIdRegistered(bytes32 indexed eventId, address indexed registrar);
    event VaultAttachedToEvent(bytes32 indexed eventId, address indexed vault, bytes32 indexed recruitmentId);

    mapping(bytes32 => address) public vaultOf;
    mapping(bytes32 => address) public creatorOf;
    mapping(bytes32 => bool) public eventRegistered;
    mapping(address => bool) public isVault;
    address[] private _vaults;
    mapping(bytes32 => bytes32[]) private _eventRecruitmentKeys;
    mapping(bytes32 => mapping(bytes32 => bool)) private _eventRecruitmentLinked;

    function createVault(ConsultationVault.Config calldata cfg) external returns (ConsultationVault vault) {
        if (cfg.eventId == bytes32(0)) revert InvalidEventId();
        bytes32 salt = cfg.recruitmentId;
        if (salt == bytes32(0)) revert InvalidRecruitmentId();
        bytes32 id = recruitmentKey(msg.sender, salt);

        if (!eventRegistered[cfg.eventId]) {
            eventRegistered[cfg.eventId] = true;
            emit EventIdRegistered(cfg.eventId, msg.sender);
        }

        address existing = vaultOf[id];
        if (existing != address(0)) {
            // 設定済みの金庫は置き換えられない。未設定の金庫は作成者本人だけが作り直せる。
            if (ConsultationVault(existing).isConfigured() || creatorOf[id] != msg.sender) {
                revert RecruitmentIdTaken(id, existing);
            }
            bytes32 currentEventId = ConsultationVault(existing).eventId();
            if (currentEventId != cfg.eventId) {
                revert RecruitmentEventMismatch(currentEventId, cfg.eventId);
            }
        }

        ConsultationVault.Config memory scopedConfig = cfg;
        scopedConfig.recruitmentId = id;
        vault = new ConsultationVault(scopedConfig);
        vaultOf[id] = address(vault);
        creatorOf[id] = msg.sender;
        isVault[address(vault)] = true;
        _vaults.push(address(vault));
        if (!_eventRecruitmentLinked[cfg.eventId][id]) {
            _eventRecruitmentLinked[cfg.eventId][id] = true;
            _eventRecruitmentKeys[cfg.eventId].push(id);
        }

        emit VaultCreated(id, address(vault), msg.sender, vault.isConfigured(), existing);
        emit VaultAttachedToEvent(cfg.eventId, address(vault), id);
    }

    /// @notice Every deployed instance, including superseded unconfigured drafts.
    function vaults() external view returns (address[] memory) {
        return _vaults;
    }

    /// @notice Current vault per creator-scoped recruitment key attached to this event.
    function vaultsForEvent(bytes32 eventId) external view returns (address[] memory) {
        bytes32[] storage keys = _eventRecruitmentKeys[eventId];
        address[] memory linkedVaults = new address[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) {
            linkedVaults[i] = vaultOf[keys[i]];
        }
        return linkedVaults;
    }

    /// @notice Number of distinct recruitment keys for this event, not historical deployments.
    function eventVaultCount(bytes32 eventId) external view returns (uint256) {
        return _eventRecruitmentKeys[eventId].length;
    }

    function recruitmentKey(address creator, bytes32 salt) public pure returns (bytes32) {
        return keccak256(abi.encode(creator, salt));
    }

    /// @notice Total deployments, including superseded unconfigured drafts.
    function vaultCount() external view returns (uint256) {
        return _vaults.length;
    }
}
