// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./DexLib.sol";
import "./ErrorMessage.sol";
import "./interface/IButterMosV2.sol";
import "./interface/IButterRouterV2.sol";
// import "hardhat/console.sol";

contract ButterRouterV2 is IButterRouterV2, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    uint256 private constant FEE_DENOMINATOR = 1000000;

    address private immutable wToken;

    address public mosAddress;

    address public feeReceiver;

    uint256 public feeRate;

    uint256 public fixedFee;

    mapping(address => bool) public approved;

    modifier transferIn(address token,uint256 amount,bytes memory permitData) {
        require(amount > 0,ErrorMessage.ZERO_IN);
        if (permitData.length > 0) {
            _permit(permitData);
        }
        if (DexLib._isNative(token)) {
            require(msg.value == amount,ErrorMessage.COST_MISMATCH);
        } else {
            SafeERC20.safeTransferFrom(
                IERC20(token),
                msg.sender,
                address(this),
                amount
            );
        }
        _;
    }

    // use to solve deep stack
    struct SwapTemp {
        address srcToken;
        address swapToken;
        uint256 srcAmount;
        uint256 swapAmount;
    }

    event SwapAndBridge(
        address indexed from,
        address indexed originToken,
        uint256 indexed originAmount,
        uint256 formChain,
        uint256 toChain,
        address bridgeToken,
        uint256 bridgeAmount,
        bytes32 orderId,
        bytes to
    );

    event SwapAndCall(
        bytes32 indexed orderId,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 swapAmount,
        uint256 callAmount);

    event CollectFee(address indexed token, address indexed receiver, uint256 indexed amount,FeeType feeType);
    event Approve(address indexed executor, bool indexed flag);
    event SetMos(address indexed mos);
    event SetFee(address indexed receiver,uint256 indexed rate,uint256 indexed fixedf);

    constructor(address _mosAddress, address _owner,address _wToken) payable {
        require(_owner != DexLib.ZERO_ADDRESS,ErrorMessage.ZERO_ADDR);
        require(_wToken.isContract(),ErrorMessage.NO_CONTRACT);
        wToken = _wToken;
        _transferOwnership(_owner);
        _setMosAddress(_mosAddress);
    }

    function swapAndBridge(
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData
    ) external payable override transferIn(_srcToken, _amount, _permitData) {
        require(_bridgeData.length > 0, ErrorMessage.BRIDGE_REQUIRE);

        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;

        if (_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            bool result;
            (result, swapTemp.swapToken, swapTemp.swapAmount) = _makeSwap(swapTemp.srcAmount, swapTemp.srcToken, swap);
            require(result, ErrorMessage.SWAP_FAIL);
            require(swapTemp.swapAmount >= swap.minReturnAmount,ErrorMessage.RECEIVE_LOW);
        }

        BridgeParam memory bridge = abi.decode(_bridgeData, (BridgeParam));
        bytes32 orderId = _doBridge(msg.sender, swapTemp.swapToken, swapTemp.swapAmount, bridge);

        emit SwapAndBridge(msg.sender, swapTemp.srcToken, swapTemp.srcAmount, block.chainid, bridge.toChain, swapTemp.swapToken, swapTemp.swapAmount, orderId, bridge.receiver);
    }

    function swapAndCall(address _srcToken, uint256 _amount,FeeType _feeType, bytes calldata _swapData, bytes calldata _callbackData, bytes calldata _permitData)
    external 
    payable
    override
    nonReentrant
    transferIn(_srcToken, _amount, _permitData)
    {
        bool result;
        SwapTemp memory swapTemp;

        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;

        uint256 tokenAmount;

        (, tokenAmount) = _collectFee(swapTemp.srcToken, swapTemp.srcAmount,_feeType);

        require(_swapData.length > 0, ErrorMessage.SWAP_REQUIRE);

        SwapParam memory swap = abi.decode(_swapData, (SwapParam));

        (result, swapTemp.swapToken, swapTemp.swapAmount)= _makeSwap(tokenAmount, swapTemp.srcToken, swap);

        require(result, ErrorMessage.SWAP_FAIL);
        require(swapTemp.swapAmount >= swap.minReturnAmount,ErrorMessage.RECEIVE_LOW);

        if (_callbackData.length == 0) {
            // send the swapped token to receiver
            if (swapTemp.swapAmount > 0) {
                _transfer(swapTemp.swapToken, swap.receiver, swapTemp.swapAmount);
            }
            emit SwapAndCall(bytes32(""), swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount , 0);
        } else {
            (CallbackParam memory callParam) = abi.decode(_callbackData,(CallbackParam));
            require(swapTemp.swapAmount >= callParam.amount,ErrorMessage.CALL_AMOUNT_INVALID);

            (result, tokenAmount) = _callBack(swapTemp.swapToken, callParam);
            require(result,ErrorMessage.CALL_FAIL);

            if (swapTemp.swapAmount > tokenAmount) {
                _transfer(swapTemp.swapToken, callParam.receiver, swapTemp.swapAmount  - tokenAmount);
            }
            emit SwapAndCall(bytes32(""), swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount , tokenAmount);
        }
    }

    // _srcToken must erc20 Token or wToken
    function remoteSwapAndCall(bytes32 id, address _srcToken,  uint256 _amount, bytes calldata _swapAndCall)
    external
    payable
    override
    nonReentrant
    {
        bool result;
        address targetToken = _srcToken;
        uint256 tokenAmount = _amount;
        address receiver;
        require (msg.sender == mosAddress,ErrorMessage.MOS_ONLY);
        require (DexLib._getBalance(_srcToken, address(this)) >= _amount,ErrorMessage.RECEIVE_LOW);

        (bytes memory _swapData,bytes memory _callbackData,bool aggregation) = abi.decode(_swapAndCall,(bytes,bytes,bool));
        require (_swapData.length + _callbackData.length > 0, ErrorMessage.DATA_EMPTY);

        if(_swapData.length > 0) {
            if(aggregation){
                SwapParam memory swap = abi.decode(_swapData, (SwapParam));
                receiver = swap.receiver;
                (result, targetToken, tokenAmount) = _makeSwap(tokenAmount, _srcToken, swap);
            } else {
                (result,targetToken,tokenAmount,receiver) = _makeSingleSwap(tokenAmount, _srcToken, _swapData);
            }
            if (!result) {
                if(_srcToken == wToken) {
                    if(_safeWithdraw(_amount)){
                        _srcToken = DexLib.ZERO_ADDRESS;
                    }
                }
                _transfer(_srcToken, receiver, _amount);
                return;
            }
        }
        if(targetToken == wToken) {
            if(_safeWithdraw(tokenAmount)){
                targetToken = DexLib.ZERO_ADDRESS;
            }
        }
        uint256 callAmount = 0;
        if(_callbackData.length > 0){
            CallbackParam memory callParam = abi.decode(_callbackData, (CallbackParam));
            receiver = callParam.receiver;
            if (tokenAmount >= callParam.amount) {
                (result, callAmount) = _callBack(targetToken, callParam);
            }
        }
        // refund
        if (tokenAmount > callAmount) {
            _transfer(targetToken, receiver, tokenAmount - callAmount);
        }

        emit SwapAndCall(id, _srcToken, targetToken, _amount, tokenAmount, callAmount);
    }

    function setFee(address _feeReceiver, uint256 _feeRate,uint256 _fixedFee) external onlyOwner {
        require(_feeReceiver != DexLib.ZERO_ADDRESS,ErrorMessage.ZERO_ADDR);

        require(_feeRate < FEE_DENOMINATOR);

        feeReceiver = _feeReceiver;

        feeRate = _feeRate;

        fixedFee = _fixedFee;

        emit SetFee(_feeReceiver,_feeRate,fixedFee);
    }

   function _collectFee(address _token,uint256 _amount,FeeType _feeType)internal returns(uint256 _fee,uint256 _remain){
        if(feeReceiver == address(0)){
            _remain = _amount;
            return(_fee,_remain);
        }
        if(_feeType == FeeType.FIXED){
            _fee = fixedFee;
            if(DexLib._isNative(_token)){
               require(msg.value > fixedFee,ErrorMessage.COST_LITTLE);
               _remain = _amount - _fee;
            } else {
               require(msg.value == fixedFee,ErrorMessage.COST_MISMATCH);
               _remain = _amount;
            }
            _token = DexLib.ZERO_ADDRESS;
        } else {
            _fee = _amount * feeRate / FEE_DENOMINATOR;
            _remain = _amount - _fee;
        }
        if(_fee > 0) {
            _transfer(_token,feeReceiver,_fee);
           emit CollectFee(_token,feeReceiver,_fee,_feeType);
        }
       
   }

    function _makeSwap(uint256 _amount, address _srcToken, SwapParam memory _swap) internal returns(bool _result, address _dstToken, uint256 _returnAmount){
        require(approved[_swap.executor],ErrorMessage.NO_APPROVE);
        _dstToken = _swap.dstToken;
        _returnAmount = DexLib._getBalance(_dstToken, address(this));
        if (DexLib._isNative(_srcToken)) {
            (_result,) = _swap.executor.call{value: _amount}(_swap.data);
        } else {
            IERC20(_srcToken).safeApprove(_swap.executor,_amount);
            (_result,) = _swap.executor.call(_swap.data);

            if (!_result) {
                IERC20(_srcToken).safeApprove(_swap.executor,0);
            }
        }
        _returnAmount = DexLib._getBalance(_dstToken, address(this)) - _returnAmount;
    }

    
    enum DexType {
        UNIV2,
        UNIV3,
        CURVE
    }

    function _makeSingleSwap(uint256 _amount, address _srcToken, bytes memory _swap) internal returns(bool _result, address _dstToken, uint256 _returnAmount,address _receiver){
        (bytes memory params,address router,DexType dexType,address receiver) = abi.decode(_swap,(bytes,address,DexType,address));
        _receiver = receiver;
        require(approved[router], ErrorMessage.NO_APPROVE);
        IERC20(_srcToken).safeApprove(router,_amount);  
        if(dexType == DexType.UNIV2){
            (_result,_dstToken,_returnAmount) =  DexLib._makeUniV2Swap(router,_amount,params);
        } else if(dexType == DexType.UNIV3){
            (_result,_dstToken,_returnAmount) =  DexLib._makeUniV3Swap(router,_amount,params);
        } else if(dexType == DexType.CURVE){
            (_result,_dstToken,_returnAmount) =  DexLib._makeCurveSwap(router,_amount,params);
        } else {
            _result = false;
        }
    }

    function _callBack(address _token, CallbackParam memory _callParam) internal returns (bool _result, uint256 _callAmount) {
        require(approved[_callParam.target], ErrorMessage.NO_APPROVE);

        _callAmount = DexLib._getBalance(_token, address(this));

        if (DexLib._isNative(_token)) {
            (_result, )  = _callParam.target.call{value: _callParam.amount}(_callParam.data);
        } else {
            IERC20(_token).safeApprove(_callParam.target, _callParam.amount);
            (_result, )  = _callParam.target.call(_callParam.data);
            IERC20(_token).safeApprove(_callParam.target,0);
        }

        _callAmount = _callAmount - DexLib._getBalance(_token, address(this));
    }

    function _doBridge(address _sender, address _token, uint256 _value, BridgeParam memory _bridge) internal returns (bytes32 _orderId) {
        if (DexLib._isNative(_token)) {
            _orderId = IButterMosV2(mosAddress).swapOutNative{value: _value} (
                    _sender,
                    _bridge.receiver,
                    _bridge.toChain,
                    _bridge.data
            );
        } else {
            IERC20(_token).safeApprove(mosAddress, _value);
            _orderId = IButterMosV2(mosAddress).swapOutToken(
                    _sender,
                    _token,
                    _bridge.receiver,
                    _value,
                    _bridge.toChain,
                    _bridge.data
            );
        }
    }


    function getFee(uint256 _amount,address _token,FeeType _feeType) external view override returns(address _feeReceiver,address _feeToken,uint256 _fee,uint256 _feeAfter){
        if(feeReceiver == DexLib.ZERO_ADDRESS){
            return(DexLib.ZERO_ADDRESS,DexLib.ZERO_ADDRESS,0,_amount);
        }
        if(_feeType == FeeType.FIXED){
            _feeToken = DexLib.ZERO_ADDRESS;
            _fee = fixedFee;
            if(!DexLib._isNative(_token)){
               _feeAfter = _amount;
            } else {
                _feeAfter = _amount - _fee;
            }
        } else {
            _feeToken = _token;
            _fee = _amount * feeRate / FEE_DENOMINATOR;
            _feeAfter = _amount - _fee;
        }
        _feeReceiver = feeReceiver;
    }

    function setMosAddress(
        address _mosAddress
    ) public onlyOwner returns (bool) {
        _setMosAddress(_mosAddress);
        return true;
    }

    function _setMosAddress(address _mosAddress) internal returns (bool) {
        require(
            _mosAddress.isContract(),
            ErrorMessage.NO_CONTRACT
        );
        mosAddress = _mosAddress;
        emit SetMos(_mosAddress);
        return true;
    }

    function _transfer(address _token,address _to,uint256 _amount) internal {
        if(DexLib._isNative(_token)){
             Address.sendValue(payable(_to),_amount);
        }else{
            IERC20(_token).safeTransfer(_to,_amount);
        }
    }

    function _safeWithdraw(uint value) internal returns(bool) {
        (bool success, bytes memory data) = wToken.call(abi.encodeWithSelector(0x2e1a7d4d, value));
        return (success && (data.length == 0 || abi.decode(data, (bool))));
    }

    function _permit(bytes memory _data) internal {
        (
            address token,
            address owner,
            address spender,
            uint256 value,
            uint256 deadline,
            uint8 v,
            bytes32 r,
            bytes32 s
        ) = abi.decode(
                _data,
                (
                    address,
                    address,
                    address,
                    uint256,
                    uint256,
                    uint8,
                    bytes32,
                    bytes32
                )
            );

        SafeERC20.safePermit(
            IERC20Permit(token),
            owner,
            spender,
            value,
            deadline,
            v,
            r,
            s
        );
    }


    function setAuthorization(address _excutor, bool _flag) external onlyOwner {
        require(_excutor.isContract(), ErrorMessage.NO_CONTRACT);
        approved[_excutor] = _flag;
        emit Approve(_excutor,_flag);
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        _transfer(_token,msg.sender,_amount);
    }

    receive() external payable {}
}
