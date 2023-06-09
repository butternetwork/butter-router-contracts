// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./interface/IMessageReceiverApp.sol";
import "./interface/IButterRouterV2.sol";
import "./lib/Helper.sol";
import "./lib/ErrorMessage.sol";

// Stargate deploy address https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet   -- router
// context(Amarok) deploy address  https://docs.connext.network/resources/deployments  -- context
// celer deploy address https://im-docs.celer.network/developer/contract-addresses-and-rpc-info -- MessageBus

interface IAuthorization {
    function approved(address _callTo) external view returns(bool);
}

contract Receiver is ReentrancyGuard,Ownable2Step{
   using SafeERC20 for IERC20;
   using Address for address;


   address public authorization;
   uint256 public recoverGas;
   address public amarokRouter;
   address public sgRouter;
   address public cBridgeMessageBus;


    event StargateRouterSet(address indexed _router);
    event CBridgeMessageBusSet(address indexed _router);
    event AmarokRouterSet(address indexed _router);
    event AuthorizationSet(address indexed _authorization);
    event RecoverGasSet(uint256 indexed _recoverGas);

    event SwapAndCall(
        address indexed from,
        address indexed receiver,
        address indexed target,
        bytes32 transactionId,
        address originToken,
        address swapToken,
        uint256 originAmount,
        uint256 swapAmount,
        uint256 callAmount
    );

    // use to solve deep stack
    struct Temp {
        bytes32 transactionId;
        address swapToken;
        uint256 srcAmount;
        uint256 swapAmount;
        address receiver;
        address target;
        uint256 callAmount;
    }

    modifier transferIn(address token,uint256 amount) {
        require(amount > 0,ErrorMessage.ZERO_IN);
        if (Helper._isNative(token)) {
            require(msg.value >= amount,ErrorMessage.FEE_MISMATCH);
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

   constructor(address _authorization,address _owner) {
     require(_authorization.isContract(),ErrorMessage.NOT_CONTRACT);
     authorization = _authorization;
     _transferOwnership(_owner);
   }


    function setStargateRouter(address _sgRouter) external onlyOwner {
        require(_sgRouter.isContract(),ErrorMessage.NOT_CONTRACT);
        sgRouter = _sgRouter;
        emit StargateRouterSet(_sgRouter);
    }

    function setAmarokRouter(address _amarokRouter) external onlyOwner {
        require(_amarokRouter.isContract(),ErrorMessage.NOT_CONTRACT);
        amarokRouter = _amarokRouter;
        emit AmarokRouterSet(_amarokRouter);
    }

    
    function setCBridgeMessageBus(address _messageBusAddress)external onlyOwner{
        require(_messageBusAddress.isContract(),ErrorMessage.NOT_CONTRACT);
        cBridgeMessageBus = _messageBusAddress;
        emit CBridgeMessageBusSet(_messageBusAddress);
    }

    function setAuthorization(address _authorization) external onlyOwner {
        require(_authorization.isContract(),ErrorMessage.NOT_CONTRACT);
        authorization = _authorization;
        emit AuthorizationSet(_authorization);
    }

    /// @notice set execution recoverGas
    /// @param _recoverGas recoverGas
    function setRecoverGas(uint256 _recoverGas) external onlyOwner {
        recoverGas = _recoverGas;
        emit RecoverGasSet(_recoverGas);
    }

    /// @notice Completes a cross-chain transaction with calldata via Amarok facet on the receiving chain.
    /// @dev This function is called from Amarok Router.
    /// @param _transferId The unique ID of this transaction (assigned by Amarok)
    /// @param _amount the amount of bridged tokens
    /// @param _asset the address of the bridged token
    /// @param * (unused) the sender of the transaction
    /// @param * (unused) the domain ID of the src chain
    /// @param _callData The data to execute
    function xReceive(
        bytes32 _transferId,
        uint256 _amount,
        address _asset,
        address,
        uint32,
        bytes memory _callData
    ) external nonReentrant {
         require (msg.sender != amarokRouter,ErrorMessage.NO_APPROVE);
         (address _receiver,bytes32 transationId,bytes memory _swapData,bytes memory _callbackData) = 
         abi.decode(_callData,(address,bytes32,bytes,bytes));
         _swapAndCall(transationId,_asset,_amount,_receiver,_swapData,_callbackData,false);
    }

    /// @notice Completes a cross-chain transaction on the receiving chain.
    /// @dev This function is called from Stargate Router.
    /// @param * (unused) The remote chainId sending the tokens
    /// @param * (unused) The remote Bridge address
    /// @param * (unused) Nonce
    /// @param * (unused) The token contract on the local chain
    /// @param _amountLD The amount of tokens received through bridging
    /// @param _payload The data to execute
     function sgReceive(
        uint16, // _srcChainId unused
        bytes memory, // _srcAddress unused
        uint256, // _nonce unused
        address _token,
        uint256 _amountLD,
        bytes memory _payload
    ) external nonReentrant {
         require (msg.sender != sgRouter,ErrorMessage.NO_APPROVE);
         (address _receiver,bytes32 transationId,bytes memory _swapData,bytes memory _callbackData) = 
         abi.decode(_payload,(address,bytes32,bytes,bytes));
         _swapAndCall(transationId,_token,_amountLD,_receiver,_swapData,_callbackData,true);
    }

        /**
     * @notice Called by MessageBus to execute a message with an associated token transfer.
     * The Receiver is guaranteed to have received the right amount of tokens before this function is called.
     * @param * (unused) The address of the source app contract
     * @param _token The address of the token that comes out of the bridge
     * @param _amount The amount of tokens received at this contract through the cross-chain bridge.
     * @param * (unused)  The source chain ID where the transfer is originated from
     * @param _message Arbitrary message bytes originated from and encoded by the source app contract
     * @param * (unused)  Address who called the MessageBus execution function
     */
    function executeMessageWithTransfer(
        address,
        address _token,
        uint256 _amount,
        uint64,
        bytes calldata _message,
        address
    )
        external
        payable
        nonReentrant
        returns (IMessageReceiverApp.ExecutionStatus)
    {    
        require (msg.sender != cBridgeMessageBus,ErrorMessage.NO_APPROVE);
        // decode message
        (
            address receiver,
            bytes32 transactionId,
            bytes memory _swapData,
            bytes memory _callbackData
        ) = abi.decode(_message,(address,bytes32,bytes,bytes));

        _swapAndCall(transactionId,_token,_amount,receiver,_swapData,_callbackData,false);

        return IMessageReceiverApp.ExecutionStatus.Success;
    }

    /**
     * @notice Called by MessageBus to process refund of the original transfer from this contract.
     * The contract is guaranteed to have received the refund before this function is called.
     * @param _token The token address of the original transfer
     * @param _amount The amount of the original transfer
     * @param _message The same message associated with the original transfer
     * @param * (unused) Address who called the MessageBus execution function
     */
    function executeMessageWithTransferRefund(
        address _token,
        uint256 _amount,
        bytes calldata _message,
        address
    )
        external
        payable
        nonReentrant
        returns (IMessageReceiverApp.ExecutionStatus)
    {     
        require (msg.sender != cBridgeMessageBus,ErrorMessage.NO_APPROVE);
        (
            address receiver,
            ,
            ,
            
        ) = abi.decode(_message,(address,bytes32,bytes,bytes));

        // return funds to cBridgeData.refundAddress
        Helper._transfer(_token,receiver,_amount);
        return IMessageReceiverApp.ExecutionStatus.Success;
    }


    function swapAndCall(bytes32 _transactionId,address _srcToken,uint256 _amount,address _receiver, bytes calldata _swapData, bytes calldata _callbackData)
    external 
    payable
    transferIn(_srcToken,_amount)
    nonReentrant
    {   
        _swapAndCall(_transactionId,_srcToken,_amount,_receiver,_swapData,_callbackData,false);
    }

    // function swapAndCall(bytes32 _transactionId,address _srcToken,uint256 _amount,address _receiver,bytes calldata _swapData,bytes calldata _callbackData)
    // external 
    // payable
    // nonReentrant
    // {   
    //     _swapAndCall(_transactionId,_srcToken,_amount,_receiver,_swapData,_callbackData);
    // }

    function _swapAndCall(bytes32 _transactionId,address _srcToken, uint256 _amount,address _receiver,bytes memory _swapData,bytes memory _callbackData,bool reserveRecoverGas)
    internal
    {

        bool result;
        Temp memory temp;
        temp.srcAmount = _amount;
        temp.swapToken = _srcToken;
        temp.swapAmount = _amount; 
        temp.receiver = _receiver;
        temp.transactionId = _transactionId;

        uint256 balance = Helper._getBalance(_srcToken,address(this));
        if(balance < _amount) {
            Helper._transfer(_srcToken,_receiver,balance);
            emit SwapAndCall(msg.sender,temp.receiver,temp.target,temp.transactionId,_srcToken,address(0),balance,0,0);
            return;
        }

        if(reserveRecoverGas && gasleft() < recoverGas) {
            Helper._transfer(_srcToken,_receiver,_amount);
            emit SwapAndCall(msg.sender,temp.receiver,temp.target,temp.transactionId,_srcToken,address(0),temp.srcAmount,0,0);
            return;
        }

        uint256 srcTokenBalanceBefore = balance - _amount;
        if(_swapData.length > 0) {
            IButterRouterV2.SwapParam memory swap = abi.decode(_swapData, (IButterRouterV2.SwapParam));
            (result,temp.swapToken, temp.swapAmount)= _makeSwap(temp.srcAmount, _srcToken, swap);
            if(!result){
                Helper._transfer(_srcToken,temp.receiver,_amount);
                emit SwapAndCall(msg.sender,temp.receiver,temp.target,temp.transactionId,_srcToken,address(0),temp.srcAmount,0,0);
                return;
            }
            temp.receiver = swap.receiver;
            temp.target = swap.executor;
        }
        if(_callbackData.length > 0){
            (IButterRouterV2.CallbackParam memory callParam) = abi.decode(_callbackData, (IButterRouterV2.CallbackParam));
            if(temp.swapAmount >= callParam.amount) {
                (result, temp.callAmount) = _callBack(temp.swapToken,callParam);
                if(!result){
                    temp.callAmount = 0;
                } else {
                    temp.receiver = callParam.receiver;
                    temp.target = callParam.target;
                }
            }
        } 
        if (temp.swapAmount > temp.callAmount) {
            Helper._transfer(temp.swapToken, temp.receiver, (temp.swapAmount - temp.callAmount));
        }

        balance = Helper._getBalance(_srcToken,address(this));
        if(balance > srcTokenBalanceBefore) {
            Helper._transfer(_srcToken,_receiver,(balance - srcTokenBalanceBefore));
        }
        emit SwapAndCall(msg.sender,temp.receiver,temp.target,temp.transactionId,_srcToken,temp.swapToken,temp.srcAmount,temp.swapAmount,temp.callAmount);
    }


    function _makeSwap(uint256 _amount, address _srcToken, IButterRouterV2.SwapParam memory _swap) internal returns(bool _result, address _dstToken, uint256 _returnAmount){
        require(_approved(_swap.executor),ErrorMessage.NO_APPROVE);
        _dstToken = _swap.dstToken;
        uint256 nativeValue = 0;
        bool isNative = Helper._isNative(_srcToken);
        if (isNative) {
            nativeValue = _amount;
        } else {
            IERC20(_srcToken).safeApprove(_swap.approveTo,0);
            IERC20(_srcToken).safeApprove(_swap.approveTo, _amount);
        }
        _returnAmount = Helper._getBalance(_dstToken, address(this));

        (_result,) = _swap.executor.call{value:nativeValue}(_swap.data);

        _returnAmount = Helper._getBalance(_dstToken, address(this)) - _returnAmount;
        
        if (!isNative ) {
            IERC20(_srcToken).safeApprove(_swap.approveTo,0);
        }
    }

    function _callBack(address _token, IButterRouterV2.CallbackParam memory _callParam) internal returns (bool _result, uint256 _callAmount) {
        require(_approved(_callParam.target), ErrorMessage.NO_APPROVE);

        _callAmount = Helper._getBalance(_token, address(this));

        if (Helper._isNative(_token)) {
            (_result, )  = _callParam.target.call{value: _callParam.amount}(_callParam.data);
        } else {          
            //if native value not enough return
            if(address(this).balance < _callParam.extraNativeAmount){
                return(false,0);
            }
            IERC20(_token).safeIncreaseAllowance(_callParam.approveTo, _callParam.amount);
            // this contract not save money make sure send value can cover this
            (_result, )  = _callParam.target.call{value:_callParam.extraNativeAmount}(_callParam.data);
            IERC20(_token).safeApprove(_callParam.approveTo,0);
        }
        _callAmount = _callAmount - Helper._getBalance(_token, address(this));
    }

    function _approved(address _callTo) internal view returns (bool) {
        return IAuthorization(authorization).approved(_callTo);
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        Helper._transfer(_token,msg.sender,_amount);
    }

    receive() external payable {}
}