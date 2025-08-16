// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFeeManager {
    struct FeeDetail {
        address feeToken;
        address routerReceiver;
        address integrator;
        uint256 routerNativeFee;
        uint256 integratorNativeFee;
        uint256 routerTokenFee;
        uint256 integratorTokenFee;
    }

    function getFeeDetail(
        address inputToken,
        uint256 inputAmount,
        bytes calldata _feeData
    ) external view returns (FeeDetail memory feeDetail);

    function getAmountBeforeFee(
        address inputToken,
        uint256 inputAmount,
        bytes calldata _feeData
    ) external view returns (address feeToken, uint256 beforeAmount, uint256 nativeFeeAmount);
}
