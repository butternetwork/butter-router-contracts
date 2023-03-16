// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./ButterLib.sol";

library Utils {
    function assembleButterCoreParam(
        address _tokenIn,
        address _tokenOut,
        uint _actualAmountIn,
        uint _predicatedAmountIn,
        address  _to,
        ButterLib.SwapParam[] memory swapParams
    )
    internal
    view
    returns (ButterLib.ButterCoreSwapParam memory) {
        uint256[]  memory amountInArr = new uint256[](swapParams.length);
        bytes[]  memory paramsArr = new bytes[](swapParams.length);
        uint32[]  memory routerIndex = new uint32[](swapParams.length);


        // modify swapParam amount in, compensate the difference between actual and predicted amount.
        if (_actualAmountIn >= _predicatedAmountIn) {
            swapParams[0].amountIn += (_actualAmountIn - _predicatedAmountIn);
        } else {
            swapParams[0].amountIn -= (_predicatedAmountIn - _actualAmountIn);
        }

        for (uint i = 0; i < swapParams.length; i++) {

            amountInArr[i] = swapParams[i].amountIn;

            routerIndex[i] = uint32(swapParams[i].routerIndex);

            paramsArr[i] = abi.encode(
                amountInArr[i],
                swapParams[i].minAmountOut,
                abi.decode(swapParams[i].path, (address[])),
                _to,
                block.timestamp + 100,
                _tokenIn,
                _tokenOut
            );
        }

        ButterLib.ButterCoreSwapParam memory params = ButterLib.ButterCoreSwapParam({
            amountInArr : amountInArr,
            paramsArr : paramsArr,
            routerIndex : routerIndex,
            inputOutAddre : [_tokenIn, _tokenOut]
        });
        return params;

    }

    function getAmountInSumFromSwapParams(ButterLib.SwapParam[] memory swapParams)
    internal
    pure
    returns (uint sum_)
    {
        sum_ = 0;
        for (uint i = 0; i < swapParams.length; i++) {
            sum_ += swapParams[i].amountIn;
        }
    }

}