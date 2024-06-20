// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IFeeManager {
    struct FeeDetail {
        address feeToken;
        address routerReceiver;
        uint256 routerNative;
        uint256 integratorNative;
        uint256 routerToken;
        uint256 integratorToken;
    }

    function getFee(
        address integrator,
        address inputToken,
        uint256 inputAmount,
        uint256 feeRate
    ) external view returns (FeeDetail memory returnFee);

    function getAmountBeforeFee(
        address integrator,
        address inputToken,
        uint256 inputAmount,
        uint256 feeRate
    ) external view returns (address feeToken, uint256 beforeAmount);
}
