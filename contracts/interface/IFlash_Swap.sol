// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface IFlash_Swap {
    function swap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _minOut,
        address _receiver
    ) external payable returns (uint256);

    function addLiquidity(
        address _tokenIn,
        uint256 _amount,
        uint256 _minLP,
        address _receiver
    ) external payable returns (uint256 lpAmount);

    function removeLiquidity(
        address _tokenOut,
        uint256 _lpAmount,
        uint256 _minOut,
        address _receiver
    ) external returns (uint256 amountOut);

    function LPToken() external view returns (address);

    function getTotalValue() external view returns (uint256 valueUSD);

    function getTokenValue(address _token, uint256 _amount) external view returns (uint256 valueUSD);

    function getAmountOut(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) external view returns (uint256 amountOut);
}
