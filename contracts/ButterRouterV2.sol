// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@butternetwork/bridge/contracts/interface/IButterMosV2.sol";
import "./lib/ErrorMessage.sol";
import "./abstract/Router.sol";
import "./lib/Helper.sol";
import "./interface/IFeeManager.sol";

contract ButterRouterV2 is Router,ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    address public mosAddress;

    uint256 public gasForReFund = 50000;

    IFeeManager public feeManager;

    struct BridgeParam {
        uint256 toChain;
        bytes receiver;
        bytes data;
    }

    event SetMos(address indexed mos);
    event SetFeeManager(address indexed _feeManager);
    event SetGasForReFund(uint256 indexed _gasForReFund);
    event CollectFee(address indexed token,address indexed receiver,uint256 indexed amount,bytes32 transferId,address integrator);
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

    constructor(address _mosAddress, address _owner,address _wToken) Router(_owner,_wToken) payable {
        _setMosAddress(_mosAddress);
    }

    function swapAndBridge(
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData
    ) external payable  nonReentrant transferIn(_srcToken, _amount, _permitData) {
        require (_swapData.length + _bridgeData.length > 0, ErrorMessage.DATA_EMPTY);
        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;
        bytes memory receiver;
        if (_swapData.length > 0) {
            Helper.SwapParam memory swap = abi.decode(_swapData, (Helper.SwapParam));
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

    function swapAndCall(bytes32 _transferId, address _srcToken, uint256 _amount,address integrator, bytes calldata _swapData, bytes calldata _callbackData, bytes calldata _permitData)
    external 
    payable
    nonReentrant
    transferIn(_srcToken, _amount, _permitData)
    {
        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.transferId = _transferId;
        require (_swapData.length + _callbackData.length > 0, ErrorMessage.DATA_EMPTY);
        (, swapTemp.swapAmount) = _collectFee(swapTemp.srcToken, swapTemp.srcAmount,swapTemp.transferId,integrator);

        (swapTemp.receiver,swapTemp.target,swapTemp.swapToken,swapTemp.swapAmount, swapTemp.callAmount) = _doSwapAndCall(_swapData,_callbackData,swapTemp.srcToken,swapTemp.swapAmount);

        if (swapTemp.swapAmount > swapTemp.callAmount) {
            Helper._transfer(swapTemp.swapToken, swapTemp.receiver, (swapTemp.swapAmount - swapTemp.callAmount));
        }

       emit SwapAndCall(msg.sender, swapTemp.receiver, swapTemp.target, swapTemp.transferId, swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount, swapTemp.callAmount);
    }

    // _srcToken must erc20 Token or wToken
    function remoteSwapAndCall(bytes32 _orderId, address _srcToken, uint256 _amount, uint256 _fromChain, bytes calldata _from, bytes calldata _swapAndCall)
    external
    payable
    nonReentrant
    {
        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;
        swapTemp.fromChain = _fromChain;
        swapTemp.toChain = block.chainid;
        swapTemp.from = _from;
        nativeBalanceBeforeExec = address(this).balance - msg.value;
        require (msg.sender == mosAddress, ErrorMessage.MOS_ONLY);
        require (Helper._getBalance(swapTemp.srcToken, address(this)) >= _amount, ErrorMessage.RECEIVE_LOW);
        (bytes memory _swapData, bytes memory _callbackData) = abi.decode(_swapAndCall, (bytes, bytes));
        require (_swapData.length + _callbackData.length > 0, ErrorMessage.DATA_EMPTY);
        bool result = true;
        uint256 minExecGas = gasForReFund * 2;
        if(gasleft() > minExecGas && _swapData.length > 0) {
            Helper.SwapParam memory swap = abi.decode(_swapData, (Helper.SwapParam));
            swapTemp.receiver = swap.receiver;
            try this.doRemoteSwap{gas:gasleft() - gasForReFund}(swap,swapTemp.srcToken,swapTemp.srcAmount) returns (address target,address dstToken,uint256 dstAmount) {
                swapTemp.swapToken = dstToken;
                swapTemp.target = target;
                swapTemp.swapAmount = dstAmount;      
            } catch  {
                result = false;    
            }
        }

        if(result && gasleft() > minExecGas && _callbackData.length > 0){
           Helper.CallbackParam memory callParam = abi.decode(_callbackData, (Helper.CallbackParam));
           try this.doRemoteCall{gas:gasleft() - gasForReFund}(callParam,swapTemp.swapToken,swapTemp.swapAmount) returns (address target,uint256 callAmount) {
                swapTemp.target = target;
                swapTemp.callAmount = callAmount;
                swapTemp.receiver = callParam.receiver;
           } catch  {
                if(swapTemp.receiver == address(0)){
                    swapTemp.receiver = callParam.receiver;
                }
           }
        }

        if(swapTemp.swapAmount > swapTemp.callAmount){
            Helper._transfer(swapTemp.swapToken, swapTemp.receiver, (swapTemp.swapAmount - swapTemp.callAmount));
        }

       emit RemoteSwapAndCall(_orderId,swapTemp.receiver,swapTemp.target,swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount, swapTemp.callAmount, swapTemp.fromChain, swapTemp.toChain, swapTemp.from);
    }


    function doRemoteSwap(Helper.SwapParam memory _swap,address _srcToken,uint256 _amount) external returns(address target,address dstToken,uint256 dstAmount) {
        require(msg.sender == address(this));
        bool result;
        (result, dstToken,dstAmount)= _makeSwap(_amount,_srcToken, _swap);
        require(result, ErrorMessage.SWAP_FAIL);
        require(dstAmount >= _swap.minReturnAmount,ErrorMessage.RECEIVE_LOW);
        target = _swap.executor;
    }

    function doRemoteCall(Helper.CallbackParam memory _callParam,address _callToken,uint256 _amount)external returns(address target,uint256 callAmount){
        require(msg.sender == address(this));
        require(_amount >= _callParam.amount, ErrorMessage.CALL_AMOUNT_INVALID);
        bool result;
        (result, callAmount) = _callBack(_callToken, _callParam);
        require(result,ErrorMessage.CALL_FAIL);
        target = _callParam.target;
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

    function _collectFee(address _token, uint256 _amount,bytes32 transferId,address integrator) internal returns(uint256 _fee, uint256 _remain){
        if(address(feeManager) == address(0)) return (0,_amount);
        address feeToken;
        (feeToken, _fee) = feeManager.getFee(integrator,_token,_amount);
        _remain = _amount;
        if(_fee == 0) return(_fee,_remain);
        if(feeToken == _token){
            _remain = _amount - _fee;
        } else if(Helper._isNative(feeToken)){
            require(msg.value >= _fee,ErrorMessage.FEE_MISMATCH);
        } else {
            SafeERC20.safeTransferFrom(IERC20(_token),msg.sender,address(this),_fee);
        }
        if(Helper._isNative(feeToken)) {
            feeManager.payFeeWithIntegrator{value:_fee}(integrator,feeToken,_amount);
        } else {
            SafeERC20.safeApprove(IERC20(_token),address(feeManager),_fee);
            feeManager.payFeeWithIntegrator(integrator,feeToken,_amount);
        }
        emit CollectFee(feeToken,address(feeManager),_fee,transferId,integrator);
   }

    function setGasForReFund(uint256 _gasForReFund)external onlyOwner {
        gasForReFund = _gasForReFund;

        emit SetGasForReFund(_gasForReFund);
    }

    function setMosAddress(
        address _mosAddress
    ) public onlyOwner returns (bool) {
        _setMosAddress(_mosAddress);
        return true;
    }

    function setFeeManager(address _feeManager) public onlyOwner  {
        require(_feeManager.isContract(),ErrorMessage.NOT_CONTRACT);
        feeManager = IFeeManager(_feeManager);
        emit SetFeeManager(_feeManager);
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

    receive() external payable {}
}
