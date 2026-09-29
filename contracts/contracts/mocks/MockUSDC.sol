// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice テスト専用の模擬 USDC（小数点以下6桁）。誰でも発行できる。実在の USDC ではない。
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC (test only)", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
