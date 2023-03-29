// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IButterRouterV2 {
    
    struct SwapParam {
        address excutor;
        // address srcToken;
        address dstToken;
        // uint256 minReturnAmount;
        bytes data;
    }

    struct BridgeParm {
        uint256 tochain;
        bytes receiver;
        bytes bridgeData;
    }

    struct Pay {
        address target;
        address token; //address(0) for native token
        uint256 amount;
        bytes data;
    }

     function swapAndBridge(
        uint256 _amount,
        address _srcToken,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData
    ) external payable;

    function swapAndPay(bytes32 orderId,bytes calldata data,address to,address tokenIn,address tokenOut,uint256 amountIn) external payable;

    function getFee() external view returns(address _feeReceiver,uint256 _feeRate);
}