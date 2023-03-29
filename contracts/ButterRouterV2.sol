// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interface/MapMosV3.sol";
import "./interface/IButterRouterV2.sol";
contract ButterRouterV2 is IButterRouterV2, Ownable2Step {
    using SafeERC20 for IERC20;
    using Address for address;

    address private constant _ETH_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address private constant _ZERO_ADDRESS = address(0);

    uint256 private constant FEE_DENOMINATOR = 100000;

    address public mosAddress;

    address public feeReceiver;

    uint256 public feeRate;

    mapping(address => bool) public approved;

    struct Temp{
        bytes32 orderId;
        uint256 mosValue;
        bytes  targetToken;
        address bridgeToken;
        uint256 tochain;
        bytes  to;
    }

    event SwapAndBridge(
        address indexed from,
        address indexed originToken,
        uint256 indexed originAmount,
        uint256 formchainId,
        uint256 tochainId,
        address bridgeToken,
        uint256 bridgeAmount,
        bytes32 orderId,
        bytes targetToken,
        bytes to
    );
    event Swap(bytes32 indexed orderId,address indexed tokenIn,address indexed tokenOut,uint256 amountIn,uint256 amountOut);
    event Fee(address indexed token,address indexed receiver,uint256 indexed amount);
    event Approve(address indexed excutor,bool indexed flag);
    event SetMos(address indexed mos);
    event SetFee(address indexed receiver,uint256 indexed rate);

    constructor(address _mosAddress) {
        _setMosAddress(_mosAddress);
    }

    function swapAndBridge(
        uint256 _amount,
        address _srcToken,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData
    ) external payable override{
        require(_amount > 0,"zero in amount");
        if (_permitData.length > 0) {
            _permit(_permitData);
        }
        if (_isNative(_srcToken)) {
            require(msg.value == _amount);
        } else {
            SafeERC20.safeTransferFrom(
                IERC20(_srcToken),
                msg.sender,
                address(this),
                _amount
            );
        }
        Temp memory temp;
        //fee
        (,temp.mosValue) = _collectFee(_srcToken, _amount);
        temp.bridgeToken = _srcToken;  
        temp.targetToken = abi.encodePacked(_srcToken); 
        if (_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            bool result;
            (result,temp.bridgeToken,temp.mosValue) = _makeSwap(temp.mosValue,_srcToken,swap);
            require(result,"swap fail");
            if(_bridgeData.length == 0 && temp.mosValue > 0){
                // if not need bridge and swap receiver is router refund to msg.sender
                _transfer(temp.bridgeToken,msg.sender,temp.mosValue);
            }
        }

        if (_bridgeData.length > 0 && temp.mosValue > 0) {
            BridgeParm memory bridge = abi.decode(_bridgeData, (BridgeParm));
            temp.to = bridge.receiver;
           (, temp.targetToken, ) = abi.decode(bridge.bridgeData,((MapMosV3.SwapParam)[], bytes, address)); 
            if (_isNative(temp.bridgeToken)) {
                temp.orderId = MapMosV3(mosAddress).swapOutNative{value: temp.mosValue}(
                    msg.sender,
                    bridge.receiver,
                    bridge.tochain,
                    bridge.bridgeData
                );
            } else {
                IERC20(temp.bridgeToken).safeApprove(mosAddress,temp.mosValue);
                temp.orderId = MapMosV3(mosAddress).swapOutToken(
                    msg.sender,
                    temp.bridgeToken,
                    bridge.receiver,
                    temp.mosValue,
                    bridge.tochain,
                    bridge.bridgeData
                );
            }
            
        }

        emit SwapAndBridge(msg.sender,_srcToken,_amount,block.chainid,temp.tochain,temp.bridgeToken,temp.mosValue,temp.orderId,temp.targetToken,temp.to);
    }

    function swapAndPay(bytes32 orderId,bytes calldata data,address to,address tokenIn,address tokenOut,uint256 amountIn) external payable override{

        require(msg.sender == mosAddress,"caller must be mos");
        // if ERC20 Token mos should tranfer in before this
        if(tokenIn == address(0)){
            amountIn = msg.value;
        }
        uint256 swapAmount = amountIn;
        (bytes memory swapBytes,bytes memory payBytes) = abi.decode(data,(bytes,bytes));
         
         if(swapBytes.length > 0 && tokenIn != tokenOut){
             SwapParam memory swap = abi.decode(swapBytes, (SwapParam));
             bool result;
             (result,tokenOut,swapAmount)= _makeSwap(amountIn,tokenIn,swap);
             emit Swap(orderId,tokenIn,tokenOut,amountIn,swapAmount); 
             if(!result) { //swap fail refund;
                 _transfer(tokenIn,to,swapAmount);
                 return;
             }
         }
         // if not need swap tokenIn == tokenOut
        if(payBytes.length > 0) {
            (Pay memory pay) = abi.decode(payBytes,(Pay));
            if(tokenOut == pay.token && swapAmount >= pay.amount){
                bool success;
                if(pay.token == address(0)) {
                 (success,)  = pay.target.call{value:pay.amount}(pay.data);
                }else {
                    IERC20(pay.token).safeApprove(pay.target,pay.amount);
                    (success,)  = pay.target.call(pay.data);
                    IERC20(pay.token).safeApprove(pay.target,0);
                }

                if(success) {
                    swapAmount = swapAmount - pay.amount;
                }
            } 
        } 
        if(swapAmount > 0){
            //refund
           _transfer(tokenOut,to,swapAmount);
        }
     
    }

    function setFee(address _feeReceiver, uint256 _feeRate) external onlyOwner {
        require(_feeReceiver != address(0), "zero address");

        require(_feeRate < FEE_DENOMINATOR);

        feeReceiver = _feeReceiver;

        feeRate = _feeRate;

        emit SetFee(_feeReceiver,_feeRate);
    }

   function _collectFee(address _token,uint256 _amount)internal returns(uint256 _fee,uint256 _remain){
        if(feeReceiver != address(0) && feeRate > 0){
            _fee = _amount * feeRate / FEE_DENOMINATOR;
            _remain = _amount - _fee;
            _transfer(_token,feeReceiver,_fee);
            emit Fee(_token,feeReceiver,_fee);
        } else {
            _fee = 0;
            _remain = _amount;
        }
   }

    function _makeSwap(uint256 _amount,address _srcToken,SwapParam memory _swap) internal returns(bool result,address _dstToken,uint256 _returnAmount){
        require(approved[_swap.excutor],"noApproved");
         _dstToken = _swap.dstToken;
         _returnAmount = _getBalance(_dstToken,address(this));
            if (_isNative(_srcToken)) {
               (result,) = _swap.excutor.call{value: _amount}(_swap.data);
            } else {
                IERC20(_srcToken).safeApprove(_swap.excutor,_amount);
               (result,) = _swap.excutor.call(_swap.data);
               if(!result){
                   IERC20(_srcToken).safeApprove(_swap.excutor,0);
               }
            }
         _returnAmount = _getBalance(_dstToken,address(this)) - _returnAmount;

    }


    function getFee() external view override returns(address _feeReceiver,uint256 _feeRate){
         _feeReceiver = feeReceiver;
         _feeRate = feeRate;
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
            "_mosAddress must be contract"
        );
        mosAddress = _mosAddress;
        emit SetMos(_mosAddress);
        return true;
    }

    function _transfer(address _token,address _to,uint256 _amount) internal {
        if(_isNative(_token)){
             Address.sendValue(payable(_to),_amount);
        }else{
            IERC20(_token).safeTransfer(_to,_amount);
        }
    }

    function _isNative(address token) internal pure returns (bool) {
        return (token == _ZERO_ADDRESS || token == _ETH_ADDRESS);
    }

    function _getBalance(address _token,address _account) internal view returns (uint256) {
        if (_isNative(_token)) {
            return _account.balance;
        } else {
            return IERC20(_token).balanceOf(_account);
        }
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
        require(_excutor.isContract(), "_excutor must be contract");

        approved[_excutor] = _flag;
        emit Approve(_excutor,_flag);
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        _transfer(_token,msg.sender,_amount);
    }

    receive() external payable {}
}
