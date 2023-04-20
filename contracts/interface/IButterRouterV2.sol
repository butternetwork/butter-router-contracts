// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IButterRouterV2 {

    enum FeeType {
        FIXED,
        PROPORTION
    }

    struct SwapParam {
        address executor;
        address receiver;
        address dstToken;
        uint256 minReturnAmount;
        bytes data;
    }

    struct BridgeParam {
        uint256 toChain;
        bytes receiver;
        bytes data;
    }

    struct CallbackParam {
        address target;
        //address token; //address(0) for native token
        uint256 amount;
        address receiver;
        bytes data;
    }

    // 1. swap: _swapData.length > 0 and _bridgeData.length == 0
    // 2. swap and call: _swapData.length > 0 and _callbackData.length > 0
    function swapAndCall(
        address _srcToken,
        uint256 _amount,
        FeeType _feeType,
        bytes calldata _swapData,
        bytes calldata _callbackData,
        bytes calldata _permitData
    ) external payable;



    // 1. bridge:  _swapData.length == 0 and _bridgeData.length > 0
    // 2. swap and bridge: _swapData.length > 0 and _bridgeData.length > 0
    function swapAndBridge(
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData
    ) external payable;


    // At remote chain call after bridge
    // mos transfer token to router first
    //  1. swap: _swapData.length > 0 and _callbackData.length == 0
    //  2. call: _swapData.length == 0 and _callbackData.length > 0
    //  3. swap and call: _swapData.length > 0 and _callbackData.length > 0
    function remoteSwapAndCall(
        bytes32 id,
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapAndCall
    ) external payable;

    function getFee(uint256 _amount,address _token,FeeType _feeType)
        external
        view
        returns (address _feeReceiver,address _feeToken,uint256 _fee,uint256 _feeAfter);
}
