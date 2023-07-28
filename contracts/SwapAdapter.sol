// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./lib/DexExecutor.sol";
import "./lib/Helper.sol";

// Be careful this contract contains unsafe call !.
// Do not approve token or just approve the right amount before call it.
// Clear approve in the same transaction if calling failed.
contract SwapAdapter is Ownable2Step, ReentrancyGuard {
    using Address for address;
    using SafeERC20 for IERC20;

    struct Param {
        address srcToken;
        address dstToken;
        address receiver;
        address leftReceiver;
        uint256 minAmount;
        SwapData[] swaps;
    }

    struct SwapData {
        uint8 dexType;
        address callTo;
        address approveTo;
        uint256 fromAmount;
        bytes callData;
    }


    event  SwapComplete(address indexed from, address indexed srcToken, uint256 indexed inputAmount, address outToken, uint256 outAmount, address receiver);


    constructor(address _owner) {
        require(_owner != Helper.ZERO_ADDRESS, "ButterAgg: zero addr");
         _transferOwnership(_owner);
    }

    // Not recommended for EOA call with token approve
    // Approve the amount you want to trade.
    // DexType 0 - AGG, 1 - UNIV2, 2 - UNIV3, 3 - CURVE
    function swap(Param calldata params) external payable nonReentrant returns (uint256 outAmount) {
        require(params.swaps.length > 0, "ButterAgg: empty swap data");

        (uint256 amount, uint256 initInputTokenBalance) = _depositToken( params.srcToken);
        uint256 finalTokenAmount = Helper._getBalance( params.dstToken, address(this));
        (uint256 amountAdjust, uint256 firstAdjust, bool isUp) = _reBuildSwaps(amount, params.swaps);
        bool isFirst = true;
        SwapData[] memory _swaps = params.swaps;
        for (uint256 i = 0; i < _swaps.length; i++) {
            if (_swaps[i].dexType > 0 && amountAdjust > 0) {
                if (isFirst) {
                    isUp ? _swaps[i].fromAmount += firstAdjust : _swaps[i].fromAmount -= firstAdjust;
                    isFirst = false;
                } else {
                    isUp ? _swaps[i].fromAmount += amountAdjust : _swaps[i].fromAmount -= amountAdjust;
                }
            }
            bool isNative = Helper._isNative(params.srcToken);
            if (!isNative) {
                IERC20(params.srcToken).safeApprove(_swaps[i].approveTo, 0);
                IERC20(params.srcToken).safeApprove(_swaps[i].approveTo, _swaps[i].fromAmount);
            }
            DexExecutor.execute(
                _swaps[i].dexType,
                _swaps[i].callTo,
                params.srcToken,
                params.dstToken,
                _swaps[i].fromAmount,
                _swaps[i].callData
            );
            if (!isNative) {
                IERC20(params.srcToken).safeApprove(_swaps[i].approveTo, 0);
            }
        }
        outAmount = Helper._getBalance(params.dstToken, address(this)) - finalTokenAmount;
        require(outAmount >= params.minAmount, "ButterAgg: swap received too low");
        uint256 left = Helper._getBalance(params.srcToken, address(this)) - initInputTokenBalance;
        if (left > 0) {
            Helper._transfer(params.srcToken, params.leftReceiver, left);
        }
        address receiver = params.receiver == address(0) ? msg.sender : params.receiver;
        Helper._transfer(params.dstToken, receiver, outAmount);
        emit SwapComplete(msg.sender, params.srcToken, amount, params.dstToken, outAmount, receiver);
    }

    function _depositToken(
        address _token
    ) private returns (uint256 amount, uint256 initInputTokenBalance) {
        initInputTokenBalance = Helper._getBalance(_token, address(this));
        if (Helper._isNative(_token)) {
            initInputTokenBalance -= msg.value;
            amount = msg.value;
        } else {
            amount = IERC20(_token).allowance(msg.sender, address(this));
            SafeERC20.safeTransferFrom(
                IERC20(_token),
                msg.sender,
                address(this),
                amount
            );
        }
        require(amount > 0, "ButterAgg: zero input");
    }

    function _reBuildSwaps(
        uint256 _amount,
        SwapData[] memory _swaps
    ) private pure returns (uint256 amountAdjust, uint256 firstAdjust, bool isUp) {
        uint256 total = 0;
        uint256 count = 0;
        for (uint256 i = 0; i < _swaps.length; i++) {
            total += _swaps[i].fromAmount;
            if (_swaps[i].dexType > 0) {
                count++;
            }
        }
        if (total > _amount) {  
            require(count > 0,"ButterAgg: cannot adjust");
            isUp = false;
            uint256 margin = total - _amount;
            amountAdjust = margin / count;
            firstAdjust = amountAdjust + (margin - amountAdjust * count);
        } else if (total < _amount) {
            if (count > 0) {
              isUp = true;
              uint256 margin =  _amount - total;
              amountAdjust = margin / count;
              firstAdjust = amountAdjust + (margin - amountAdjust * count);
            }
        }
    }

     function rescueFunds(address _token, address _receiver, uint256 _amount) external onlyOwner {
        require(_receiver != address(0));
        Helper._transfer(_token, _receiver, _amount);
    }
    
    receive() external payable {}
}
