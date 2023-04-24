// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@butternetwork/bridge/contracts/interface/IButterMosV2.sol";
import "./lib/Helper.sol";
import "./lib/ErrorMessage.sol";
import "./interface/IButterRouterV2.sol";

contract ButterRouterV2 is IButterRouterV2, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    uint256 private constant FEE_DENOMINATOR = 1000000;

    address private immutable wToken;

    address public mosAddress;

    address public dexExecutor;

    address public feeReceiver;

    uint256 public feeRate;

    uint256 public fixedFee;

    mapping(address => bool) public approved;

    modifier transferIn(address token,uint256 amount,bytes memory permitData) {
        require(amount > 0,ErrorMessage.ZERO_IN);
        if (permitData.length > 0) {
            Helper._permit(permitData);
        }
        if (Helper._isNative(token)) {
            require(msg.value == amount,ErrorMessage.FEE_MISMATCH);
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
        uint256 fromChain;
        uint256 toChain;
        bytes from;
    }


    event CollectFee(address indexed token, address indexed receiver, uint256 indexed amount,FeeType feeType);
    event Approve(address indexed executor, bool indexed flag);
    event SetMos(address indexed mos);
    event SetFee(address indexed receiver, uint256 indexed rate, uint256 indexed fixedf);
    event SetExecutor(address indexed _executor);

    constructor(address _mosAddress, address _owner,address _wToken) payable {
        require(_owner != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);
        require(_wToken.isContract(),ErrorMessage.NOT_CONTRACT);
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

        emit SwapAndBridge(orderId, msg.sender, swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount,swapTemp.swapAmount, block.chainid, bridge.toChain, bridge.receiver);
    }

    function swapAndCall(address _srcToken, uint256 _amount, FeeType _feeType, bytes calldata _swapData, bytes calldata _callbackData, bytes calldata _permitData)
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
                Helper._transfer(swapTemp.swapToken, swap.receiver, swapTemp.swapAmount);
            }
            emit SwapAndCall(msg.sender, swap.receiver, Helper.ZERO_ADDRESS, swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount , 0);
        } else {
            (CallbackParam memory callParam) = abi.decode(_callbackData, (CallbackParam));
            require(swapTemp.swapAmount >= callParam.amount, ErrorMessage.CALL_AMOUNT_INVALID);

            (result, tokenAmount) = _callBack(swapTemp.swapToken, callParam);
            require(result,ErrorMessage.CALL_FAIL);

            if (swapTemp.swapAmount > tokenAmount) {
                Helper._transfer(swapTemp.swapToken, callParam.receiver, swapTemp.swapAmount  - tokenAmount);
            }

            emit SwapAndCall(msg.sender, callParam.receiver, callParam.target, swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount , tokenAmount);
        }
    }

    // _srcToken must erc20 Token or wToken
    function remoteSwapAndCall(bytes32 _orderId, address _srcToken,  uint256 _amount, uint256 _fromChain, bytes calldata _from, bytes calldata _swapAndCall)
    external
    payable
    override
    nonReentrant
    {
        bool result;
        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;

        swapTemp.fromChain = _fromChain;
        swapTemp.toChain = block.chainid;
        swapTemp.from = _from;

        require (msg.sender == mosAddress, ErrorMessage.MOS_ONLY);
        require (Helper._getBalance(swapTemp.srcToken, address(this)) >= _amount, ErrorMessage.RECEIVE_LOW);

        (bytes memory _swapData, bytes memory _callbackData) = abi.decode(_swapAndCall, (bytes, bytes));
        require (_swapData.length + _callbackData.length > 0, ErrorMessage.DATA_EMPTY);

        if(_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            (result, swapTemp.swapToken, swapTemp.swapAmount) = _makeSwap(swapTemp.srcAmount, swapTemp.srcToken, swap);
             // swap failed or no callback execution, transfer bridge token to receiver
            if (!result || _callbackData.length == 0) {   
                {
                    address refundToken = result ? swapTemp.swapToken : swapTemp.srcToken;
                    uint256 retundAmount = result ? swapTemp.swapAmount : swapTemp.srcAmount;
                    if (refundToken == wToken) {
                        if (Helper._safeWithdraw(wToken, retundAmount)) {
                            refundToken = Helper.NATIVE_ADDRESS;
                        }
                    }
                    Helper._transfer(refundToken, swap.receiver, retundAmount);
                }
                emit RemoteSwapAndCall(_orderId, swap.receiver, Helper.ZERO_ADDRESS, swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount, 0, swapTemp.fromChain, swapTemp.toChain, swapTemp.from);
                return;
            }
        }
        // _callbackData.length > 0
        if (swapTemp.swapToken == wToken) {
            if(Helper._safeWithdraw(wToken, swapTemp.swapAmount)) {
                swapTemp.swapToken = Helper.NATIVE_ADDRESS;
            }
        }
        {
        uint256 callAmount = 0;
        CallbackParam memory callParam = abi.decode(_callbackData, (CallbackParam));
        if (swapTemp.swapAmount >= callParam.amount) {
            (result, callAmount) = _callBack(swapTemp.swapToken, callParam);
        }

        // refund
        if (swapTemp.swapAmount > callAmount) {
            Helper._transfer(swapTemp.swapToken, callParam.receiver, swapTemp.swapAmount - callAmount);
        }

        emit RemoteSwapAndCall(_orderId, callParam.receiver, callParam.target, swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount, callAmount, swapTemp.fromChain, swapTemp.toChain, swapTemp.from);
        }
    }

    function setFee(address _feeReceiver, uint256 _feeRate,uint256 _fixedFee) external onlyOwner {
        require(_feeReceiver != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);

        require(_feeRate < FEE_DENOMINATOR);

        feeReceiver = _feeReceiver;

        feeRate = _feeRate;

        fixedFee = _fixedFee;

        emit SetFee(_feeReceiver,_feeRate,fixedFee);
    }

   function _collectFee(address _token, uint256 _amount, FeeType _feeType) internal returns(uint256 _fee, uint256 _remain){
        if(feeReceiver == Helper.ZERO_ADDRESS) {
            _remain = _amount;
            return(_fee,_remain);
        }
        if(_feeType == FeeType.FIXED){
            _fee = fixedFee;
            if(Helper._isNative(_token)){
               require(msg.value > fixedFee, ErrorMessage.FEE_LOWER);
               _remain = _amount - _fee;
            } else {
               require(msg.value == fixedFee,ErrorMessage.FEE_MISMATCH);
               _remain = _amount;
            }
            _token = Helper.NATIVE_ADDRESS;
        } else {
            _fee = _amount * feeRate / FEE_DENOMINATOR;
            _remain = _amount - _fee;
        }
        if(_fee > 0) {
            Helper._transfer(_token,feeReceiver,_fee);
           emit CollectFee(_token,feeReceiver,_fee,_feeType);
        }
       
   }

    function _makeSwap(uint256 _amount, address _srcToken, SwapParam memory _swap) internal returns(bool _result, address _dstToken, uint256 _returnAmount){
        require(approved[_swap.executor],ErrorMessage.NO_APPROVE);
        _dstToken = _swap.dstToken;
        bool isNative; 
        if (Helper._isNative(_srcToken)) {
            isNative = true;
        } else {
            IERC20(_srcToken).safeApprove(_swap.executor, _amount);
            isNative = false;
        }
         _returnAmount = Helper._getBalance(_dstToken, address(this));
         
        (_result,) = dexExecutor.delegatecall(abi.encodeWithSignature("execute(uint8,address,address,uint256,bool,bytes)",
                                _swap.dexType,_swap.executor,_dstToken,_amount,isNative,_swap.data));

        _returnAmount = Helper._getBalance(_dstToken, address(this)) - _returnAmount;
        
        if (!(_result || isNative )) {
            IERC20(_srcToken).safeApprove(_swap.executor,0);
        }
    }

    function _callBack(address _token, CallbackParam memory _callParam) internal returns (bool _result, uint256 _callAmount) {
        require(approved[_callParam.target], ErrorMessage.NO_APPROVE);

        _callAmount = Helper._getBalance(_token, address(this));

        if (Helper._isNative(_token)) {
            (_result, )  = _callParam.target.call{value: _callParam.amount}(_callParam.data);
        } else {
            IERC20(_token).safeApprove(_callParam.approveTo, _callParam.amount);
            (_result, )  = _callParam.target.call(_callParam.data);
            IERC20(_token).safeApprove(_callParam.approveTo,0);
        }

        _callAmount = _callAmount - Helper._getBalance(_token, address(this));
    }

    function _doBridge(address _sender, address _token, uint256 _value, BridgeParam memory _bridge) internal returns (bytes32 _orderId) {
        if (Helper._isNative(_token)) {
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
        if(feeReceiver == Helper.ZERO_ADDRESS) {
            return(Helper.ZERO_ADDRESS, Helper.ZERO_ADDRESS, 0, _amount);
        }
        if(_feeType == FeeType.FIXED){
            _feeToken = Helper.ZERO_ADDRESS;
            _fee = fixedFee;
            if(!Helper._isNative(_token)){
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

    function setDexExecutor(
        address _dexExecutor
    ) public onlyOwner {
        require(_dexExecutor.isContract(),ErrorMessage.NOT_CONTRACT);
        dexExecutor = _dexExecutor;
        emit SetExecutor(_dexExecutor);
    }

    function _setMosAddress(address _mosAddress) internal returns (bool) {
        require(
            _mosAddress.isContract(),
            ErrorMessage.NOT_CONTRACT
        );
        mosAddress = _mosAddress;
        emit SetMos(_mosAddress);
        return true;
    }



    function setAuthorization(address _excutor, bool _flag) external onlyOwner {
        require(_excutor.isContract(), ErrorMessage.NOT_CONTRACT);
        approved[_excutor] = _flag;
        emit Approve(_excutor,_flag);
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        Helper._transfer(_token,msg.sender,_amount);
    }

    receive() external payable {}
}
