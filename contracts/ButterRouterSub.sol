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

contract ButterRouterSub is IButterRouterV2, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    address private immutable wToken;

    address public mosAddress;

    mapping(address => bool) public approved;

    modifier transferIn(address token, uint256 amount, bytes memory permitData) {
        require(amount > 0,ErrorMessage.ZERO_IN);

        if (permitData.length > 0) {
            Helper._permit(permitData);
        }
        if (Helper._isNative(token)) {
            require(msg.value >= amount, ErrorMessage.FEE_MISMATCH);
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
        bytes32 transferId;
        address receiver;
        address target;
        uint256 callAmount;
        uint256 fromChain;
        uint256 toChain;
        bytes from;
    }


    event Approve(address indexed executor, bool indexed flag);
    event SetMos(address indexed mos);

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
    ) external payable override nonReentrant transferIn(_srcToken, _amount, _permitData) {
        // require(_bridgeData.length > 0, ErrorMessage.BRIDGE_REQUIRE);

        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;
        bytes memory receiver;
        if (_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            bool result;
            (result, swapTemp.swapToken, swapTemp.swapAmount) = _makeSwap(swapTemp.srcAmount, swapTemp.srcToken, swap);
            require(result, ErrorMessage.SWAP_FAIL);
            require(swapTemp.swapAmount >= swap.minReturnAmount,ErrorMessage.RECEIVE_LOW);
            if(_bridgeData.length == 0 && swapTemp.swapAmount > 0){
                receiver = abi.encodePacked(swap.receiver);
                Helper._transfer(swapTemp.swapToken,swap.receiver,swapTemp.swapAmount);
            }
        } 
        bytes32 orderId;
        if(_bridgeData.length > 0){
           BridgeParam memory bridge = abi.decode(_bridgeData, (BridgeParam));
           swapTemp.toChain = bridge.toChain;
           receiver = bridge.receiver;
           orderId = _doBridge(msg.sender, swapTemp.swapToken, swapTemp.swapAmount, bridge); 
        }
        emit SwapAndBridge(orderId,msg.sender,swapTemp.srcToken, swapTemp.swapToken,swapTemp.srcAmount, swapTemp.swapAmount,block.chainid,swapTemp.toChain,receiver);

    }

    function swapAndCall(bytes32, address, uint256, FeeType, bytes calldata, bytes calldata, bytes calldata)
    external 
    payable
    override
    {
       revert("unsupport");
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
        uint256 _nativeBalanceBeforeExec = address(this).balance - msg.value;
        require (msg.sender == mosAddress, ErrorMessage.MOS_ONLY);
        require (Helper._getBalance(swapTemp.srcToken, address(this)) >= _amount, ErrorMessage.RECEIVE_LOW);

        (bytes memory _swapData, bytes memory _callbackData) = abi.decode(_swapAndCall, (bytes, bytes));
        require (_swapData.length + _callbackData.length > 0, ErrorMessage.DATA_EMPTY);

        if(_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            if(_srcToken == wToken && Helper._isNative(swap.dstToken)){
                result = Helper._safeWithdraw(wToken, swapTemp.srcAmount);
                if(result) swapTemp.swapToken = Helper.NATIVE_ADDRESS;
            }else if(_srcToken== swap.dstToken){
                //if user just want to receiver wtoken
                result = true;
            } else {
                (result, swapTemp.swapToken, swapTemp.swapAmount) = _makeSwap(swapTemp.srcAmount, swapTemp.srcToken, swap);
            }
             //if swap failed ,transfer bridge token to receiver
            if (!result) {   
                Helper._transfer(swapTemp.srcToken, swap.receiver, swapTemp.srcAmount);
                emit RemoteSwapAndCall(_orderId, swap.receiver, Helper.ZERO_ADDRESS, swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount, 0, swapTemp.fromChain, swapTemp.toChain, swapTemp.from);
                return;
            }
            swapTemp.target = swap.executor;
            swapTemp.receiver = swap.receiver;
        }
        
        if(_callbackData.length > 0){
            CallbackParam memory callParam = abi.decode(_callbackData, (CallbackParam));
            if (swapTemp.swapAmount >= callParam.amount) {
                (result, swapTemp.callAmount) = _callBack(swapTemp.swapToken, callParam,_nativeBalanceBeforeExec);
                if(result){
                    swapTemp.target = callParam.target;  
                }
            }
            swapTemp.receiver = callParam.receiver;
        }
        // refund
        if (swapTemp.swapAmount > swapTemp.callAmount) {
            Helper._transfer(swapTemp.swapToken, swapTemp.receiver, (swapTemp.swapAmount - swapTemp.callAmount));
        }
        emit RemoteSwapAndCall(_orderId,swapTemp.receiver,swapTemp.target, swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount, swapTemp.callAmount, swapTemp.fromChain, swapTemp.toChain, swapTemp.from);
    }


    function _makeSwap(uint256 _amount, address _srcToken, SwapParam memory _swap) internal returns(bool _result, address _dstToken, uint256 _returnAmount){
        require(approved[_swap.executor] || _swap.executor == wToken,ErrorMessage.NO_APPROVE);
        _dstToken = _swap.dstToken;
        uint256 nativeValue = 0;
        bool isNative = Helper._isNative(_srcToken);
        if (isNative) {
            nativeValue = _amount;
        } else {
            IERC20(_srcToken).safeApprove(_swap.approveTo, 0);
            IERC20(_srcToken).safeApprove(_swap.approveTo, _amount);
        }
        _returnAmount = Helper._getBalance(_dstToken, address(this));

        if(_swap.executor == wToken){
            bytes4 sig = Helper._getFirst4Bytes(_swap.data);
            //  0xd0e30db0->deposit()  0x2e1a7d4d->withdraw(uint256 wad)
            require(sig == bytes4(0xd0e30db0) || sig == bytes4(0x2e1a7d4d),ErrorMessage.NO_APPROVE);
        }

        (_result,) = _swap.executor.call{value:nativeValue}(_swap.data);

        _returnAmount = Helper._getBalance(_dstToken, address(this)) - _returnAmount;
        
        if (!isNative ) {
            IERC20(_srcToken).safeApprove(_swap.approveTo, 0);
        }
    }

    function _callBack(address _token, CallbackParam memory _callParam,uint256 _nativeBalanceBeforeExec) internal returns (bool _result, uint256 _callAmount) {
        require(approved[_callParam.target], ErrorMessage.NO_APPROVE);

        _callAmount = Helper._getBalance(_token, address(this));

        if (Helper._isNative(_token)) {
            (_result, )  = _callParam.target.call{value: _callParam.amount}(_callParam.data);
        } else {          
            //if native value not enough return
            if(address(this).balance < (_nativeBalanceBeforeExec + _callParam.extraNativeAmount)){
                return(false,0);
            }
            IERC20(_token).safeIncreaseAllowance(_callParam.approveTo, _callParam.amount);
            // this contract not save money make sure send value can cover this
            (_result, )  = _callParam.target.call{value:_callParam.extraNativeAmount}(_callParam.data);
            IERC20(_token).safeApprove(_callParam.approveTo, 0);
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


    function getFee(uint256,address,FeeType) external view override returns(address _feeReceiver,address _feeToken,uint256 _fee,uint256 _feeAfter){
    }

    function getInputBeforeFee(uint256,address,FeeType) external view override returns(uint256 _input,address _feeReceiver,address _feeToken,uint256 _fee){
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
            ErrorMessage.NOT_CONTRACT
        );
        mosAddress = _mosAddress;
        emit SetMos(_mosAddress);
        return true;
    }

    function setAuthorization(address[] calldata _excutors, bool _flag) external onlyOwner {
        require(_excutors.length > 0, ErrorMessage.DATA_EMPTY);
        for (uint i = 0; i < _excutors.length; i++) {
            require(_excutors[i].isContract(), ErrorMessage.NOT_CONTRACT);
            approved[_excutors[i]] = _flag;
            emit Approve(_excutors[i], _flag);
        }
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        Helper._transfer(_token, msg.sender, _amount);
    }

    receive() external payable {}
}
