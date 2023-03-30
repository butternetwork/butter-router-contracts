// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IButterRouterV2 {
    struct SwapParam {
        address excutor;
        address receiver;
        address dstToken;
        uint256 minReturnAmount;
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
        address receiver;
        bytes data;
    }

    struct PayResult{
        uint256 swapAmount;
        address payToken;
        address receiver;
        uint256 payAmount;
    }

    function swapAndBridge(
        uint256 _amount,
        address _srcToken,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData
    ) external payable;

    function swapAndPay(
        bytes32 id,
        uint256 _amount,
        address _srcToken,
        bytes calldata _swapData,
        bytes calldata _payData,
        bytes calldata _permitData
    ) external payable returns(PayResult memory result);

    function getFee(uint256 _amount)
        external
        view
        returns (address _feeReceiver, uint256 _feeRate);
}
