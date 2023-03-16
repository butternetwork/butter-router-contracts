// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

library ButterLib {
    struct SwapParam {
        uint256 amountIn;
        uint256 minAmountOut;
        bytes path; //evm, or tokenIn'X'tokenOut on near
        uint64 routerIndex; // pool id on near or router index on evm
    }

    struct SwapData {
        bytes swapParams;
        bytes targetToken;
        address mapTargetToken;
    }

    struct ButterCoreSwapParam {
        uint256[]  amountInArr;
        bytes[]    paramsArr;
        uint32[]  routerIndex;
        address[2]  inputOutAddre; // 0 -input  1- Out
    }

}