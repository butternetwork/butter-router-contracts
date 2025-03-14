// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAffiliateFeeManager {
    function getAffiliatesFee(uint256 amount, bytes calldata feeData) external view returns (uint256 totalFee);

    function collectAffiliatesFee(
        bytes32 orderId,
        address token,
        uint256 amount,
        bytes calldata feeData
    ) external returns (uint256 totalFee);
}
