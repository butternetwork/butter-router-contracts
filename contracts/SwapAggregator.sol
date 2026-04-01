// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { Aggregator } from "./abstract/Aggregator.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";


contract SwapAggregator is Aggregator, Ownable2Step, ReentrancyGuard, Multicall {
    using Address for address;
    using SafeERC20 for IERC20;
    address public wToken;

    struct Param {
        address srcToken;
        address dstToken;
        address receiver;
        address leftReceiver;
        uint256 inputAmount;
        uint256 minAmount;
        uint256 deadline;
        SwapData[] swaps;
    }

    struct SwapData {
        uint8 dexType;
        address callTo;
        address approveTo;
        uint256 fromAmount;
        bytes callData;
    }

    event SetWtoken(address _wToken);
    event EditFuncBlackList(bytes4 _func, bool flag);
    event SwapComplete(
        address indexed from,
        address indexed srcToken,
        uint256 indexed inputAmount,
        address outToken,
        uint256 outAmount,
        address receiver
    );

    event SweepTokenWithFee(
        address token,
        uint256 totalAmount,
        uint256 recipientAmount,
        address recipient,
        uint256 feeAmount,
        address feeRecipient
    );

    uint256 public immutable selfChainId = block.chainid;

    error SwapAggregator_expired();
    error SwapAggregator_zero_input();
    error SwapAggregator_input_mismatch();
    error SwapAggregator_swap_received_too_low();
    error SwapAggregator_unwrap_failed();

    modifier ensure(uint256 deadline) {
        if(deadline < block.timestamp) revert SwapAggregator_expired();
        _;
    }

    constructor(address _owner, address _wToken, address _uniPermit2) Aggregator(_uniPermit2) {
        require(_owner != ZERO_ADDRESS);
        _transferOwnership(_owner);
        _setWToken(_wToken);
    }

    function setWToken(address _wToken) external onlyOwner {
        _setWToken(_wToken);
    }

    function setUniPermits(address _uniPermit2) external onlyOwner {
        _setUniPermits(_uniPermit2);
    }

    function _setWToken(address _wToken) internal {
        require(_wToken != ZERO_ADDRESS);
        wToken = _wToken;
        emit SetWtoken(_wToken);
    }

    function editFuncBlackList(bytes4 _func, bool _flag) external onlyOwner {
        funcBlackList[_func] = _flag;
        emit EditFuncBlackList(_func, _flag);
    }

    function permit(
        address token,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        IERC20Permit(token).permit(msg.sender, address(this), amount, deadline, v, r, s);
    }


    function swap(Param calldata params) external payable nonReentrant ensure(params.deadline) returns (uint256 outAmount) {
        uint256 len = params.swaps.length;
        require(len > 0);
        _depositToken(params.srcToken, params.inputAmount);
        (uint256 amountAdjust, uint256 firstAdjust, bool isUp) = _rebuildSwaps(params.inputAmount, len, params.swaps);
        bool needAdjust = (firstAdjust != 0);
        for (uint256 i = 0; i < len;) {
            SwapData calldata swapStruct = params.swaps[i];
            uint256 amount = swapStruct.fromAmount;
           if (needAdjust) {
                if (i == 0) {
                    isUp ? amount += firstAdjust : amount -= firstAdjust;
                } else {
                    isUp ? amount += amountAdjust : amount -= amountAdjust;
                }
            }
            _execute(
                swapStruct.dexType,
                swapStruct.callTo,
                swapStruct.approveTo,
                params.srcToken,
                amount,
                swapStruct.callData
            );

            unchecked {
                ++i;
            }
        }
        address self = address(this);
        if(_isNative(params.dstToken)) {
            address _wToken = wToken;
            uint256 wrapAmount = _getBalance(_wToken, self);
            if(wrapAmount> 0) _safeWithdraw(_wToken, wrapAmount);
        }
        outAmount = _getBalance(params.dstToken, self);
        if(outAmount < params.minAmount) revert SwapAggregator_swap_received_too_low();
        uint256 left = _getBalance(params.srcToken, self);
        if (left > 0) {
            _transfer(selfChainId, params.srcToken, params.leftReceiver, left);
        }
        address receiver = params.receiver == address(0) ? msg.sender : params.receiver;
        if(receiver != self) _transfer(selfChainId, params.dstToken, receiver, outAmount);
        emit SwapComplete(msg.sender, params.srcToken, params.inputAmount, params.dstToken, outAmount, receiver);
    }


    function sweepTokenWithFee(
        address token,
        address recipient,
        uint256 feeBips,
        address feeRecipient
    ) external nonReentrant {
        require(feeBips > 0 && feeBips <= 100);
        require(recipient != ZERO_ADDRESS && feeRecipient != ZERO_ADDRESS);
        uint256 balanceToken = _getBalance(token, address(this));

        if (balanceToken > 0) {
            uint256 feeAmount = balanceToken * feeBips / 10_000;
            if (feeAmount > 0) _transfer(selfChainId, token, feeRecipient, feeAmount);

            uint256 recipientAmount = balanceToken - feeAmount;
            _transfer(selfChainId, token, recipient, recipientAmount);
            emit SweepTokenWithFee(
                token,
                balanceToken,
                recipientAmount,
                recipient,
                feeAmount,
                feeRecipient
            );
        }

    }

    function _depositToken(address _token, uint256 _amount) private {
        if(_amount == 0) revert SwapAggregator_zero_input();
        if (_isNative(_token)) {
            if(_amount != msg.value) revert SwapAggregator_input_mismatch();
        } else {
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        }
    }

    function _rebuildSwaps(
        uint256 _amount,
        uint256 _len,
        SwapData[] calldata _swaps
    ) private pure returns (uint256 amountAdjust, uint256 firstAdjust, bool isUp) {
        uint256 total = 0;
        for (uint256 i = 0; i < _len; ) {
            total += _swaps[i].fromAmount;
            unchecked {
                ++i;
            }
        }
        isUp = total < _amount;
        uint256 margin = isUp ? _amount - total : total - _amount;
        if(margin > 0) {
            amountAdjust = margin / _len;
            firstAdjust = amountAdjust + (margin - amountAdjust * _len);
        }
    }

    function _safeWithdraw(address _wToken, uint _amount) internal {
        (bool success, bytes memory data) = _wToken.call(abi.encodeWithSelector(0x2e1a7d4d, _amount));
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) revert SwapAggregator_unwrap_failed();
    }

    function rescueFunds(address _token, address _receiver, uint256 _amount) external onlyOwner {
        require(_receiver != ZERO_ADDRESS);
        _transfer(selfChainId, _token, _receiver, _amount);
    }

    receive() external payable {}
}
