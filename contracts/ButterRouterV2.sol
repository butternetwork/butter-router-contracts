// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interface/IButterMosV2.sol";
import "./interface/IButterRouterV2.sol";

contract ButterRouterV2 is IButterRouterV2, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    address private constant ZERO_ADDRESS = address(0);

    address private constant NATIVE_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    uint256 private constant FEE_DENOMINATOR = 1000000;

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

    event CollectFee(address indexed token, address indexed receiver, uint256 indexed amount);
    event Approve(address indexed executor, bool indexed flag);
    event SetMos(address indexed mos);
    event SetFee(address indexed receiver,uint256 indexed rate);

    constructor(address _mosAddress, address _owner) payable {
        require(_owner != address(0), "_owner zero address");
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
        require(_bridgeData.length > 0, "bridge data required");

        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;

        if (_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            bool result;
            (result, swapTemp.swapToken, swapTemp.swapAmount) = _makeSwap(swapTemp.srcAmount, swapTemp.srcToken, swap);
            require(result, "ButterRouterV2: swap failed");
            require(swapTemp.swapAmount >= swap.minReturnAmount,"ButterRouterV2: receive too low");
        }

        BridgeParam memory bridge = abi.decode(_bridgeData, (BridgeParam));
        bytes32 orderId = _doBridge(msg.sender, swapTemp.swapToken, swapTemp.swapAmount, bridge);

        emit SwapAndBridge(msg.sender, swapTemp.srcToken, swapTemp.srcAmount, block.chainid, bridge.toChain, swapTemp.swapToken, swapTemp.swapAmount, orderId, bridge.receiver);
    }

    function swapAndCall(address _srcToken, uint256 _amount, bytes calldata _swapData, bytes calldata _callbackData, bytes calldata _permitData)
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
        (, tokenAmount) = _collectFee(swapTemp.srcToken, swapTemp.srcAmount);

        require(_swapData.length > 0, "ButterRouterV2: swap data required");

        SwapParam memory swap = abi.decode(_swapData, (SwapParam));

        (result, swapTemp.swapToken, swapTemp.swapAmount)= _makeSwap(tokenAmount, swapTemp.srcToken, swap);

        require(result, "ButterRouterV2: swap failed");
        require(swapTemp.swapAmount >= swap.minReturnAmount, "ButterRouterV2: swap received too low");

        if (_callbackData.length == 0) {
            // send the swapped token to receiver
            if (swapTemp.swapAmount > 0) {
                _transfer(swapTemp.swapToken, swap.receiver, swapTemp.swapAmount);
            }
        } else {
            (CallbackParam memory callParam) = abi.decode(_callbackData,(CallbackParam));
            require(swapTemp.swapAmount >= callParam.amount, "ButterRouterV2: callback amount invalid");

            (result, tokenAmount) = _callBack(swapTemp.swapToken, callParam);
            require(result, "ButterRouterV2: callback failed");

            if (swapTemp.swapAmount > tokenAmount) {
                _transfer(swapTemp.swapToken, callParam.receiver, swapTemp.swapAmount  - tokenAmount);
            }

            emit SwapAndCall(bytes32(""), swapTemp.srcToken, swapTemp.swapToken, swapTemp.srcAmount, swapTemp.swapAmount , tokenAmount);
        }
    }


    function remoteSwapAndCall(bytes32 id, address _srcToken,  uint256 _amount, bytes calldata _swapData, bytes calldata _callbackData)
    external
    payable
    override
    nonReentrant
    {
        bool result;

        address targetToken = _srcToken;
        uint256 tokenAmount = _amount;

        require (msg.sender == mosAddress, "ButterRouterV2: mos only");

        require (_getBalance(_srcToken, address(this)) >= _amount, "ButterRouterV2: received too low");
        require (_swapData.length + _callbackData.length > 0, "ButterRouterV2: swap or callback data required");

        if(_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));

            (result, targetToken, tokenAmount) = _makeSwap(tokenAmount, _srcToken, swap);

            // require(result, "ButterRouterV2: swap fail");
            // swap failed, return the source token to receiver
            if (!result) {
                _transfer(_srcToken, swap.receiver, _amount);
                return;
            }

            // require (tokenAmount >= swap.minReturnAmount, "ButterRouterV2: swap received too low");
            // return the swapped token to receiver
            if (tokenAmount < swap.minReturnAmount) {
                if (tokenAmount > 0) {
                    _transfer(targetToken, swap.receiver, tokenAmount);
                }
                return;
            }

            if (_callbackData.length == 0) {
                // send the swapped token to receiver
                if (tokenAmount > 0) {
                    _transfer(targetToken, swap.receiver, tokenAmount);
                }
                return;
            }
        }

        uint256 callAmount = 0;
        CallbackParam memory callParam = abi.decode(_callbackData, (CallbackParam));
        if (tokenAmount >= callParam.amount) {
            (result, callAmount) = _callBack(targetToken, callParam);
        }

        // refund
        if (tokenAmount > callAmount) {
            _transfer(targetToken, callParam.receiver, tokenAmount - callAmount);
        }

        emit SwapAndCall(id, _srcToken, targetToken, _amount, tokenAmount, callAmount);
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
            emit CollectFee(_token,feeReceiver,_fee);
        } else {
            _fee = 0;
            _remain = _amount;
        }
   }

    function _makeSwap(uint256 _amount, address _srcToken, SwapParam memory _swap) internal returns(bool _result, address _dstToken, uint256 _returnAmount){
        require(approved[_swap.executor], "ButterRouterV2: swap not approved");
        _dstToken = _swap.dstToken;
        _returnAmount = _getBalance(_dstToken, address(this));
            if (_isNative(_srcToken)) {
               (_result,) = _swap.executor.call{value: _amount}(_swap.data);
            } else {
                IERC20(_srcToken).safeApprove(_swap.executor,_amount);
                (_result,) = _swap.executor.call(_swap.data);

                if (!_result) {
                    IERC20(_srcToken).safeApprove(_swap.executor,0);
                }
            }

        _returnAmount = _getBalance(_dstToken, address(this)) - _returnAmount;
    }

    function _callBack(address _token, CallbackParam memory _callParam) internal returns (bool _result, uint256 _callAmount) {
        require(approved[_callParam.target], "ButterRouterV2: swap not approved");

        _callAmount = _getBalance(_token, address(this));

        if (_isNative(_token)) {
            (_result, )  = _callParam.target.call{value: _callParam.amount}(_callParam.data);
        } else {
            IERC20(_token).safeApprove(_callParam.target, _callParam.amount);
            (_result, )  = _callParam.target.call(_callParam.data);
            IERC20(_token).safeApprove(_callParam.target,0);
        }

        _callAmount = _callAmount - _getBalance(_token, address(this));
    }

    function _doBridge(address _sender, address _token, uint256 _value, BridgeParam memory _bridge) internal returns (bytes32 _orderId) {
        if (_isNative(_token)) {
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
        return (token == ZERO_ADDRESS || token == NATIVE_ADDRESS);
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
