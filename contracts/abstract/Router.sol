// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../lib/ErrorMessage.sol";
import "../lib/Helper.sol";

abstract contract Router is Ownable2Step {  
    using SafeERC20 for IERC20;
    using Address for address;

    uint256 public feeRate;
    uint256 public fixedFee;
    address public feeReceiver;
    address internal immutable wToken;
    uint256 internal nativeBalanceBeforeExec;
    uint256 private constant FEE_DENOMINATOR = 1000000;

    mapping(address => bool) public approved;

    event Approve(address indexed executor, bool indexed flag);
    event SetFee(address indexed receiver, uint256 indexed rate, uint256 indexed fixedf);
    event CollectFee(address indexed token, address indexed receiver, uint256 indexed amount,bytes32 transferId,FeeType feeType);

    enum FeeType {
        FIXED,
        PROPORTION
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
        FeeType feeType;
    }

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
  
    modifier transferIn(address token, uint256 amount, bytes memory permitData) {
        require(amount > 0,ErrorMessage.ZERO_IN);

        if (permitData.length > 0) {
            Helper._permit(permitData);
        }
        nativeBalanceBeforeExec = address(this).balance - msg.value;
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

        nativeBalanceBeforeExec;
    }

    constructor(address _owner,address _wToken) payable {
        require(_owner != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);
        require(_wToken.isContract(),ErrorMessage.NOT_CONTRACT);
        wToken = _wToken;
        _transferOwnership(_owner);
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

    function _callBack(address _token,Helper.CallbackParam memory _callParam) internal returns (bool _result, uint256 _callAmount) {
        require(approved[_callParam.target], ErrorMessage.NO_APPROVE);
        (_result,_callAmount) = Helper._callBack(_token,_callParam);
        require(address(this).balance >= nativeBalanceBeforeExec,ErrorMessage.NATIVE_VAULE_OVERSPEND);
    }

    function _makeSwap(uint256 _amount, address _srcToken, Helper.SwapParam memory _swap) internal returns(bool _result, address _dstToken, uint256 _returnAmount){
        require(approved[_swap.executor] || _swap.executor == wToken,ErrorMessage.NO_APPROVE);
        if(_swap.executor == wToken){
            bytes4 sig = Helper._getFirst4Bytes(_swap.data);
            //0x2e1a7d4d -> withdraw(uint256 wad)  0xd0e30db0 -> deposit()
            if(sig != bytes4(0x2e1a7d4d) && sig != bytes4(0xd0e30db0)) {
                return(false,_srcToken,0);
            }
        }
        (_result,_dstToken,_returnAmount) = Helper._makeSwap(_amount,_srcToken,_swap);
    }

    function setAuthorization(address[] calldata _executors, bool _flag) external onlyOwner {
        require(_executors.length > 0, ErrorMessage.DATA_EMPTY);
        for (uint i = 0; i < _executors.length; i++) {
            require(_executors[i].isContract(), ErrorMessage.NOT_CONTRACT);
            approved[_executors[i]] = _flag;
            emit Approve(_executors[i], _flag);
        }
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        Helper._transfer(_token, msg.sender, _amount);
    }
}