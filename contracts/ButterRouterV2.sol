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

    modifier transferIn(address token,uint256 amount,bytes memory permitData) {
        require(amount > 0,"zero in amount");
        if (permitData.length > 0) {
            _permit(permitData);
        }
        if (_isNative(token)) {
            require(msg.value == amount);
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

    struct BridgeTemp{
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
    event SwapAndPay(bytes32 indexed orderId,address indexed tokenIn,address indexed tokenOut,uint256 amountIn,uint256 amountOut,uint256 payAmount);
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
    ) external payable override transferIn(_srcToken,_amount,_permitData){      
        BridgeTemp memory temp;
        temp.mosValue = _amount;
        temp.bridgeToken = _srcToken;  
        temp.targetToken = abi.encodePacked(_srcToken); 
        if (_swapData.length > 0) {
            //fee
            (,temp.mosValue) = _collectFee(_srcToken, _amount);
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            bool result;
            (result,temp.bridgeToken,temp.mosValue) = _makeSwap(temp.mosValue,_srcToken,swap);
            require(result,"swap fail");
            require(temp.mosValue >= swap.minReturnAmount,"receive too low");
            if(_bridgeData.length == 0 && temp.mosValue > 0){
                // if not need bridge and swap receiver is router refund to user
                 address receiver = swap.receiver == address(0) ? msg.sender : swap.receiver;
                _transfer(temp.bridgeToken,receiver,temp.mosValue);
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

    function swapAndPay(bytes32 id,uint256 _amount,address _srcToken,bytes calldata _swapData,bytes calldata _payData,bytes calldata _permitData) 
    external 
    payable
    override
    transferIn(_srcToken,_amount,_permitData)
    returns(PayResult memory payResult)
   {
        payResult.swapAmount = _amount;
        payResult.payToken = _srcToken;
        payResult.receiver;
        if(msg.sender != mosAddress){
           (,payResult.swapAmount) = _collectFee(_srcToken,_amount);
        }
        if(_swapData.length > 0){
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            bool result;
            (result,payResult.payToken,payResult.swapAmount)= _makeSwap(payResult.swapAmount,_srcToken,swap);
            require(result,"swap fail");
            require(payResult.swapAmount >= swap.minReturnAmount,"receive too low");
            payResult.receiver = swap.receiver;
        }

        if(_payData.length > 0) {
            (Pay memory pay) = abi.decode(_payData,(Pay));
            if(payResult.payToken == pay.token && payResult.swapAmount >= pay.amount){
                bool success;
                if(pay.token == address(0)) {
                 (success,)  = pay.target.call{value:pay.amount}(pay.data);
                }else {
                    IERC20(pay.token).safeApprove(pay.target,pay.amount);
                    (success,)  = pay.target.call(pay.data);
                    IERC20(pay.token).safeApprove(pay.target,0);
                }

                if(success) {
                    payResult.payAmount = pay.amount;
                }
            } 
            payResult.receiver = pay.receiver;
        } 
        {
          uint256 left = payResult.swapAmount - payResult.payAmount;
          if(left > 0){
             payResult.receiver = payResult.receiver == address(0) ? msg.sender : payResult.receiver ;
             //refund
             _transfer(payResult.payToken,payResult.receiver,left);
           }
        }

       emit SwapAndPay(id,_srcToken,payResult.payToken,_amount,payResult.swapAmount,payResult.payAmount);
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


    function getFee(uint256 _amount) external view override returns(address _feeReceiver,uint256 _fee){
        if(feeRate > 0 && feeReceiver != address(0)){
           _feeReceiver = feeReceiver;
           _fee = _amount * feeRate / FEE_DENOMINATOR;
        }

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
