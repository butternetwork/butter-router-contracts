// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./LibAsset.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "hardhat/console.sol";
library LibSwap {
    struct SwapData {
        address callTo;
        address approveTo;
        address sendingAssetId;
        address receivingAssetId;
        uint256 fromAmount;
        bytes callData;
        bool requiresDeposit;
    }

    event AssetSwapped(
        bytes32 transactionId,
        address dex,
        address fromAssetId,
        address toAssetId,
        uint256 fromAmount,
        uint256 toAmount,
        uint256 timestamp
    );

    function swap(bytes32 transactionId, SwapData memory _swap) internal {
        require(_swap.callTo.code.length > 0,"E10");
        uint256 fromAmount = _swap.fromAmount;
        require(fromAmount > 0,"E11");
        uint256 nativeValue = LibAsset._isNative(_swap.sendingAssetId)
            ? _swap.fromAmount
            : 0;
        uint256 initialSendingAssetBalance = LibAsset._getBalance(_swap.sendingAssetId,address(this));
        uint256 initialReceivingAssetBalance = LibAsset._getBalance(_swap.receivingAssetId,address(this));
        if (nativeValue == 0) {
            LibAsset._maxApproveERC20(
                IERC20(_swap.sendingAssetId),
                _swap.approveTo,
                _swap.fromAmount
            );
        }
        require(initialSendingAssetBalance >= _swap.fromAmount,"E12");
        // solhint-disable-next-line avoid-low-level-calls
        (bool success,) = _swap.callTo.call{value: nativeValue}(_swap.callData);
        require(success,"E22");
        uint256 newBalance = LibAsset._getBalance(_swap.receivingAssetId,address(this));
        emit AssetSwapped(
            transactionId,
            _swap.callTo,
            _swap.sendingAssetId,
            _swap.receivingAssetId,
            _swap.fromAmount,
            newBalance > initialReceivingAssetBalance
                ? newBalance - initialReceivingAssetBalance
                : newBalance,
            block.timestamp
        );
    }
}
