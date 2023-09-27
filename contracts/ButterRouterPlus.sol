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



contract ButterRouterPlus is Router,ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    enum FeeType {
        FIXED,
        PROPORTION
    }
    uint256 public feeRate;
    uint256 public fixedFee;
    address public feeReceiver;
    uint256 private constant FEE_DENOMINATOR = 1000000;
    event SetFee(address indexed receiver, uint256 indexed rate, uint256 indexed fixedf);
    event CollectFee(address indexed token, address indexed receiver, uint256 indexed amount,bytes32 transferId,FeeType feeType);
    constructor(address _owner,address _wToken)Router(_owner,_wToken) payable {}

    function swapAndCall(bytes32 _transferId, address _srcToken, uint256 _amount, FeeType _feeType, bytes calldata _swapData, bytes calldata _callbackData, bytes calldata _permitData)
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
        (, swapTemp.swapAmount) = _collectFee(swapTemp.srcToken, swapTemp.srcAmount,swapTemp.transferId,_feeType);

        (swapTemp.receiver,swapTemp.target,swapTemp.swapToken,swapTemp.swapAmount, swapTemp.callAmount) = _doSwapAndCall(_swapData,_callbackData,swapTemp.srcToken,swapTemp.swapAmount);

        if (swapTemp.swapAmount > swapTemp.callAmount) {
            Helper._transfer(swapTemp.swapToken, swapTemp.receiver, (swapTemp.swapAmount - swapTemp.callAmount));
        }

       emit SwapAndCall(msg.sender, swapTemp.receiver, swapTemp.target, swapTemp.transferId, swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount, swapTemp.callAmount);
    }


      function setFee(address _feeReceiver, uint256 _feeRate,uint256 _fixedFee) external onlyOwner {
        require(_feeReceiver != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);

        require(_feeRate < FEE_DENOMINATOR);

        feeReceiver = _feeReceiver;

        feeRate = _feeRate;

        fixedFee = _fixedFee;

        emit SetFee(_feeReceiver,_feeRate,fixedFee);
    }

    function getFee(uint256 _amount,address _token,FeeType _feeType) external view returns(address _feeReceiver,address _feeToken,uint256 _fee,uint256 _feeAfter){
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

    
    function getInputBeforeFee(uint256 _amountAfterFee,address _token, FeeType _feeType) external view returns(uint256 _input,address _feeReceiver,address _feeToken,uint256 _fee){
        if(feeReceiver == Helper.ZERO_ADDRESS) {
            return(_amountAfterFee,Helper.ZERO_ADDRESS, Helper.ZERO_ADDRESS, 0);
        }
       if(_feeType == FeeType.FIXED){
            _feeToken = Helper.ZERO_ADDRESS;
            _fee = fixedFee;
            if(!Helper._isNative(_token)){
               _input = _amountAfterFee;
            } else {
                _input = _amountAfterFee + _fee;
            }
        } else {
            _feeToken = _token;
            _input = _amountAfterFee * FEE_DENOMINATOR / (FEE_DENOMINATOR - feeRate) + 1;
            _fee = _input - _amountAfterFee;
        }
        _feeReceiver = feeReceiver;
    }

    function _collectFee(address _token, uint256 _amount,bytes32 transferId,FeeType _feeType) internal returns(uint256 _fee, uint256 _remain){
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
               require(msg.value >= fixedFee,ErrorMessage.FEE_MISMATCH);
               _remain = _amount;
            }
            _token = Helper.NATIVE_ADDRESS;
        } else {
            _fee = _amount * feeRate / FEE_DENOMINATOR;
            _remain = _amount - _fee;
        }
        if(_fee > 0) {
            Helper._transfer(_token,feeReceiver,_fee);
           emit CollectFee(_token,feeReceiver,_fee,transferId,_feeType);
        }
       
   }
   
    receive() external payable {}
}
