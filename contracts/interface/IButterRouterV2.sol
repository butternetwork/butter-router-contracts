// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IButterRouterV2 {

    enum FeeType {
        FIXED,
        PROPORTION
    }

    struct SwapParam {
        uint8 dexType;
        address executor;
        address approveTo; 
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
        address approveTo; 
        uint256 amount;
        uint256 extraNativeAmount;
        address receiver;
        bytes data;
    }


    event SwapAndBridge(
        bytes32 indexed orderId,
        address indexed from,
        address indexed originToken,
        address bridgeToken,
        uint256 originAmount,
        uint256 bridgeAmount,
        uint256 fromChain,
        uint256 toChain,
        bytes to
    );

    event SwapAndCall(
        address indexed from,
        address indexed receiver,
        address indexed target,
        bytes32 transferId,
        address originToken,
        address swapToken,
        uint256 originAmount,
        uint256 swapAmount,
        uint256 callAmount
    );


    event RemoteSwapAndCall(
        bytes32 indexed orderId,
        address indexed receiver,
        address indexed target,
        address originToken,
        address swapToken,
        uint256 originAmount,
        uint256 swapAmount,
        uint256 callAmount,
        uint256 fromChain,
        uint256 toChain,
        bytes from
    );


    // 1. swap: _swapData.length > 0 and _bridgeData.length == 0
    // 2. swap and call: _swapData.length > 0 and _callbackData.length > 0
    function swapAndCall(
        bytes32 _transferId,
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
        bytes32 _orderId,
        address _srcToken,
        uint256 _amount,
        uint256 _fromChain,
        bytes calldata _from,
        bytes calldata _swapAndCall
    ) external payable;

    function getFee(uint256 _amount,address _token,FeeType _feeType)
        external
        view
        returns (address _feeReceiver,address _feeToken,uint256 _fee,uint256 _feeAfter);

      function getInputBeforeFee(uint256 _amountAfterFee,address _token,FeeType _feeType) external view  returns(uint256 _input,address _feeReceiver,address _feeToken,uint256 _fee);
}
