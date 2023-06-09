// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./DexExecutor.sol";
import "./lib/Helper.sol";

//Becareful this contract canstans unsafe call Do not approve token for this 
//or approve just got the right amount form another contract before call him 
//if call failed clear approve in the same transation;
contract AggregationAdapter is Ownable2Step,ReentrancyGuard {
    using Address for address;
    using SafeERC20 for IERC20;

    struct Param {
        address srcToken;
        address dstToken;
        address receiver;
        address leftRecerver;
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
    event  SwapComplete(address indexed from,address indexed srcToken,uint256 indexed inputAmount,address outToken,uint256 outAmount,address receiver);
    constructor(address _owner){
         _transferOwnership(_owner);
    }

    // Not fit to be called by EOA with token approve
    // The amount approveed is equal to the amount you want to trade
    // enum DexType {AGG,UNIV2,UNIV3,CURVE}
    // DexType 0 - AGG, 1 - UNIV2, 2 - UNIV3, 3 - CURVE
    function swap(Param calldata params) external payable nonReentrant returns (uint256 outAmount) {
        require(params.swaps.length > 0, "empty swap data");
        (uint256 amount, uint256 initInputTokenBalance) = _depositToken( params.srcToken);
        uint256 finalTokenAmount = Helper._getBalance( params.dstToken,address(this));
        (uint256 amountAdjust, uint256 firstAdjust) = _reBuildSwaps(amount,params.swaps);
        bool isFirst = true;
        SwapData[] memory _swaps = params.swaps;
        for (uint256 i = 0; i < _swaps.length; i++) {
            if (_swaps[i].dexType > 0 && amountAdjust > 0) {
                if (isFirst) {
                    _swaps[i].fromAmount -= firstAdjust;
                    isFirst = false;
                } else {
                    _swaps[i].fromAmount -= amountAdjust;
                }
            }
            bool isNative = Helper._isNative(params.srcToken);
            if (!isNative) {
                IERC20(params.srcToken).safeApprove(_swaps[i].approveTo, 0);
                IERC20(params.srcToken).safeApprove(_swaps[i].approveTo,_swaps[i].fromAmount);
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
        require(outAmount >= params.minAmount, "swap receive too low");
        uint256 left = Helper._getBalance(params.srcToken, address(this)) - initInputTokenBalance;
        if (left > 0) {
            Helper._transfer(params.srcToken, params.leftRecerver, left);
        }
        address receiver = params.receiver == address(0) ? msg.sender : params.receiver;
        Helper._transfer(params.dstToken,receiver, outAmount); 
        emit SwapComplete(msg.sender,params.srcToken,amount,params.dstToken,outAmount,receiver);
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
        require(amount > 0, "zero input");
    }

    function _reBuildSwaps(
        uint256 _amount,
        SwapData[] memory _swaps
    ) private pure returns (uint256 amountAdjust, uint256 firstAdjust) {
        uint256 total = 0;
        uint256 count = 0;
        for (uint256 i = 0; i < _swaps.length; i++) {
            total += _swaps[i].fromAmount;
            if (_swaps[i].dexType > 0) { 
                count++;
            }
        }
        if (total > _amount) {
            require(count > 0,"cannt adjust");
            uint256 margin = total - _amount;
            amountAdjust = margin / count;
            firstAdjust = amountAdjust + (margin - amountAdjust * count);
        }
    }

     function rescueFunds(address _token, address _receiver,uint256 _amount) external onlyOwner {
        require(_receiver != address(0));
        Helper._transfer(_token,_receiver,_amount);
    }
    
    receive() external payable {}
}
