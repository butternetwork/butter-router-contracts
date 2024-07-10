// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interface/IMORC20Receiver.sol";
import "./interface/IMORC20.sol";
import "./lib/Helper.sol";

contract OmniAdapter is Ownable2Step, ReentrancyGuard, IMORC20Receiver {
    using SafeERC20 for IERC20;

    struct InterTransferParam {
        uint256 toChainId;
        bytes toAddress;
        uint256 gasLimit;
        bytes refundAddress;
        bytes messageData;
        address feeToken;
        uint256 fee;
        address feePayer;
    }

    // use to solve deep stack
    struct Temp {
        address token;
        address swapToken;
        uint256 swapAmount;
        address receiver;
        address target;
        uint256 callAmount;
    }

    event EditBackList(bytes4 _func, bool flag);
    event InterTransferAndCall(address proxy, address token, uint256 amount);
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
    mapping(bytes4 => bool) blackList;

    uint256 public immutable selfChainId = block.chainid;

    receive() external payable {}

    constructor(address _owner) {
        require(_owner != address(0), "OmniAdapter: zero addr");
        _transferOwnership(_owner);

        //| a9059cbb | transfer(address,uint256)
        blackList[bytes4(0xa9059cbb)] = true;
        //| 095ea7b3 | approve(address,uint256) |
        blackList[bytes4(0x095ea7b3)] = true;
        //| 23b872dd | transferFrom(address,address,uint256) |
        blackList[bytes4(0x23b872dd)] = true;
        //| 39509351 | increaseAllowance(address,uint256)
        blackList[bytes4(0x39509351)] = true;
        //| a22cb465 | setApprovalForAll(address,bool) |
        blackList[bytes4(0xa22cb465)] = true;
        //| 42842e0e | safeTransferFrom(address,address,uint256) |
        blackList[bytes4(0x42842e0e)] = true;
        //| b88d4fde | safeTransferFrom(address,address,uint256,bytes) |
        blackList[bytes4(0xb88d4fde)] = true;
        //| 9bd9bbc6 | send(address,uint256,bytes) |
        blackList[bytes4(0x9bd9bbc6)] = true;
        //| fe9d9303 | burn(uint256,bytes) |
        blackList[bytes4(0xfe9d9303)] = true;
        //| 959b8c3f | authorizeOperator
        blackList[bytes4(0x959b8c3f)] = true;
        //| f242432a | safeTransferFrom(address,address,uint256,uint256,bytes) |
        blackList[bytes4(0xf242432a)] = true;
        //| 2eb2c2d6 | safeBatchTransferFrom(address,address,uint256[],uint256[],bytes) |
        blackList[bytes4(0x2eb2c2d6)] = true;
    }

    function editBackList(bytes4 _func, bool _flag) external onlyOwner {
        blackList[_func] = _flag;
        emit EditBackList(_func, _flag);
    }

    function interTransferAndCall(
        uint256 amount,
        address proxy,
        InterTransferParam calldata interTransferParam
    ) external payable nonReentrant {
        require(amount != 0, "OmniAdapter: zero in");
        require(proxy != Helper.ZERO_ADDRESS, "OmniAdapter: zero addr");
        address token = IMORC20(proxy).token();

        uint256 value;
        // transfer token in
        if (Helper._isNative(token)) {
            require(msg.value == amount, "OmniAdapter:receive too low");
            value = amount;
        } else {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            if (token != proxy) {
                IERC20(token).safeIncreaseAllowance(proxy, amount);
            }
        }
        // fee
        if (token == interTransferParam.feeToken) {
            // amount must > fee or overflow
            amount -= interTransferParam.fee;
        } else {
            if (Helper._isNative(interTransferParam.feeToken)) {
                require(msg.value == interTransferParam.fee, "OmniAdapter:fee mismatch");
                value = interTransferParam.fee;
            } else {
                require(interTransferParam.feePayer != Helper.ZERO_ADDRESS, "OmniAdapter: zero addr");
                IERC20(interTransferParam.feeToken).safeTransferFrom(
                    interTransferParam.feePayer,
                    address(this),
                    interTransferParam.fee
                );
                IERC20(interTransferParam.feeToken).safeIncreaseAllowance(proxy, interTransferParam.fee);
            }
        }
        // bridge
        if (interTransferParam.messageData.length != 0) {
            IMORC20(proxy).interTransferAndCall{value: value}(
                address(this),
                interTransferParam.toChainId,
                interTransferParam.toAddress,
                amount,
                interTransferParam.gasLimit,
                interTransferParam.refundAddress,
                interTransferParam.messageData
            );
        } else {
            IMORC20(proxy).interTransfer{value: value}(
                address(this),
                interTransferParam.toChainId,
                interTransferParam.toAddress,
                amount,
                interTransferParam.gasLimit
            );
        }
        emit InterTransferAndCall(proxy, token, amount);
    }

    function onMORC20Received(
        uint256,
        bytes memory,
        uint256 _amount,
        bytes32 _orderId,
        bytes calldata _message
    ) external override nonReentrant returns (bool) {
        Temp memory t;
        address proxy = msg.sender;
        t.token = IMORC20(proxy).token();
        require(Helper._getBalance(t.token, address(this)) >= _amount, "OmniAdapter:receive too low");
        (bytes memory _swapData, bytes memory _callbackData) = abi.decode(_message, (bytes, bytes));
        require(_swapData.length + _callbackData.length > 0, "OmniAdapter:data empty");
        (t.receiver, t.target, t.swapToken, t.swapAmount, t.callAmount) = _doSwapAndCall(
            _swapData,
            _callbackData,
            t.token,
            _amount
        );

        if (t.swapAmount > t.callAmount) {
            Helper._transfer(selfChainId, t.swapToken, t.receiver, (t.swapAmount - t.callAmount));
        }
        emit SwapAndCall(
            msg.sender,
            t.receiver,
            t.target,
            _orderId,
            t.token,
            t.swapToken,
            _amount,
            t.swapAmount,
            t.callAmount
        );
        return true;
    }

    function estimateFee(
        address proxy,
        uint256 toChain,
        uint256 gasLimit
    ) external view returns (address feeToken, uint256 fee) {
        return IMORC20(proxy).estimateFee(toChain, gasLimit);
    }

    function _doSwapAndCall(
        bytes memory _swapData,
        bytes memory _callbackData,
        address _srcToken,
        uint256 _amount
    ) internal returns (address receiver, address target, address dstToken, uint256 swapOutAmount, uint256 callAmount) {
        bool result;
        swapOutAmount = _amount;
        dstToken = _srcToken;
        if (_swapData.length > 0) {
            Helper.SwapParam memory swap = abi.decode(_swapData, (Helper.SwapParam));
            (result, dstToken, swapOutAmount) = _makeSwap(_amount, _srcToken, swap);
            require(result, "OmniAdapter:swap fail");
            require(swapOutAmount >= swap.minReturnAmount, "OmniAdapter:receive too low");
            receiver = swap.receiver;
            target = swap.executor;
        }

        if (_callbackData.length > 0) {
            Helper.CallbackParam memory callParam = abi.decode(_callbackData, (Helper.CallbackParam));
            (result, callAmount) = _callBack(swapOutAmount, dstToken, callParam);
            require(result, "OmniAdapter:callback fail");
            receiver = callParam.receiver;
            target = callParam.target;
        }
    }

    function _makeSwap(
        uint256 _amount,
        address _srcToken,
        Helper.SwapParam memory _swap
    ) internal returns (bool _result, address _dstToken, uint256 _returnAmount) {
        require(_checkCallFunction(_swap.data), "backList");
        (_result, _dstToken, _returnAmount) = Helper._makeSwap(_amount, _srcToken, _swap);
    }

    function _callBack(
        uint256 _amount,
        address _token,
        Helper.CallbackParam memory _callParam
    ) internal returns (bool _result, uint256 _callAmount) {
        require(_checkCallFunction(_callParam.data), "backList");
        (_result, _callAmount) = Helper._callBack(_amount, _token, _callParam);
    }

    function _checkCallFunction(bytes memory callDatas) internal view returns (bool) {
        if (callDatas.length < 4) {
            return false;
        }
        bytes4 _func = Helper._getFirst4Bytes(callDatas);
        if (blackList[_func]) {
            return false;
        }
        return true;
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        Helper._transfer(selfChainId, _token, msg.sender, _amount);
    }
}
