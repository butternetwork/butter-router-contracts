// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./LibAsset.sol";
import "./Validatable.sol";
import "./LibSwap.sol";
// import "hardhat/console.sol";

/// @title Swapper
/// @notice Abstract contract to provide swap functionality
abstract contract Swapper {

    /// @dev only used to get around "Stack Too Deep" errors
    struct ReserveData {
        bytes32 transactionId;
        address payable leftoverReceiver;
        uint256 nativeReserve;
    }

    /// Modifiers ///

    /// @dev Sends any leftover balances back to the user
    /// @notice Sends any leftover balances to the user
    /// @param _swaps Swap data array
    /// @param _leftoverReceiver Address to send leftover tokens to
    /// @param _initialBalances Array of initial token balances
    modifier noLeftovers(
        LibSwap.SwapData[] memory _swaps,
        address payable _leftoverReceiver,
        uint256[] memory _initialBalances
    ) {
        uint256 numSwaps = _swaps.length;
        if (numSwaps != 1) {
            address finalAsset = _swaps[numSwaps - 1].receivingAssetId;
            uint256 curBalance;

            _;

            for (uint256 i = 0; i < numSwaps - 1; ) {
                address curAsset = _swaps[i].receivingAssetId;
                // Handle multi-to-one swaps
                if (curAsset != finalAsset) {
                    curBalance = LibAsset._getBalance(curAsset,address(this)) -_initialBalances[i];
                    if (curBalance > 0) {
                        LibAsset._transfer(curAsset,_leftoverReceiver,curBalance);
                    }
                }
                unchecked {
                    ++i;
                }
            }
        } else {
            _;
        }
    }

    /// @dev Sends any leftover balances back to the user reserving native tokens
    /// @notice Sends any leftover balances to the user
    /// @param _swaps Swap data array
    /// @param _leftoverReceiver Address to send leftover tokens to
    /// @param _initialBalances Array of initial token balances
    modifier noLeftoversReserve(
        LibSwap.SwapData[] memory _swaps,
        address payable _leftoverReceiver,
        uint256[] memory _initialBalances,
        uint256 _nativeReserve
    ) {
        uint256 numSwaps = _swaps.length;
        if (numSwaps != 1) {
            address finalAsset = _swaps[numSwaps - 1].receivingAssetId;
            uint256 curBalance;

            _;

            for (uint256 i = 0; i < numSwaps - 1; ) {
                address curAsset = _swaps[i].receivingAssetId;
                // Handle multi-to-one swaps
                if (curAsset != finalAsset) {
                    curBalance =
                        LibAsset._getBalance(curAsset,address(this)) - _initialBalances[i];
                    uint256 reserve = LibAsset._isNative(curAsset)
                        ? _nativeReserve
                        : 0;
                    if (curBalance > 0) {
                        LibAsset._transfer(curAsset,_leftoverReceiver,curBalance - reserve);
                    }
                }
                unchecked {
                    ++i;
                }
            }
        } else {
            _;
        }
    }

    /// @dev Refunds any excess native asset sent to the contract after the main function
    /// @notice Refunds any excess native asset sent to the contract after the main function
    /// @param _refundReceiver Address to send refunds to
    modifier refundExcessNative(address payable _refundReceiver) {
        uint256 initialBalance = address(this).balance - msg.value;
        _;
        uint256 finalBalance = address(this).balance;
        uint256 excess = finalBalance > initialBalance
            ? finalBalance - initialBalance
            : 0;
        if (excess > 0) {
             LibAsset._transfer(LibAsset.NATIVE_ADDRESS,_refundReceiver,excess);
        }
    }

    /// Internal Methods ///

    /// @dev Deposits value, executes swaps, and performs minimum amount check
    /// @param _transactionId the transaction id associated with the operation
    /// @param _minAmount the minimum amount of the final asset to receive
    /// @param _swaps Array of data used to execute swaps
    /// @param _leftoverReceiver The address to send leftover funds to
    /// @return uint256 result of the swap
    function _depositAndSwap(
        bytes32 _transactionId,
        uint256 _minAmount,
        LibSwap.SwapData[] memory _swaps,
        address _integrator,
        address payable _leftoverReceiver
    ) internal returns (uint256) {
        uint256 numSwaps = _swaps.length;
        require(numSwaps > 0,"E13");
        address finalTokenId = _swaps[numSwaps - 1].receivingAssetId;
        uint256 initialBalance = LibAsset._getBalance(finalTokenId,address(this));
        if (LibAsset._isNative(finalTokenId)) {
            initialBalance -= msg.value;
        }

        uint256[] memory initialBalances = _fetchBalances(_swaps);
        depositAssets(_swaps,_integrator);
        _executeSwaps(
            _transactionId,
            _swaps,
            _leftoverReceiver,
            initialBalances
        );
        uint256 newBalance = LibAsset._getBalance(finalTokenId,address(this)) - initialBalance;
        require(newBalance >= _minAmount,"E14");
        return newBalance;
    }

    /// @dev Deposits value, executes swaps, and performs minimum amount check and reserves native token for fees
    /// @param _transactionId the transaction id associated with the operation
    /// @param _minAmount the minimum amount of the final asset to receive
    /// @param _swaps Array of data used to execute swaps
    /// @param _leftoverReceiver The address to send leftover funds to
    /// @param _nativeReserve Amount of native token to prevent from being swept back to the caller
    function _depositAndSwap(
        bytes32 _transactionId,
        uint256 _minAmount,
        LibSwap.SwapData[] memory _swaps,
        address _integrator,
        address payable _leftoverReceiver,
        uint256 _nativeReserve
    ) internal returns (uint256) {

        uint256 numSwaps = _swaps.length;
        require(numSwaps > 0,"E15");
        address finalTokenId = _swaps[numSwaps - 1].receivingAssetId;
        uint256 initialBalance = LibAsset._getBalance(finalTokenId,address(this));
        if (LibAsset._isNative(finalTokenId)) {
            initialBalance -= msg.value;
        }
        uint256[] memory initialBalances = _fetchBalances(_swaps);
        depositAssets(_swaps,_integrator);
        ReserveData memory rd = ReserveData(
            _transactionId,
            _leftoverReceiver,
            _nativeReserve
        );
        _executeSwaps(rd, _swaps, initialBalances);
        uint256 newBalance = LibAsset._getBalance(finalTokenId,address(this)) -initialBalance;
        require(newBalance >= _minAmount,"E16");
        return newBalance;
    }

    /// Private Methods ///

    /// @dev Executes swaps and checks that DEXs used are in the allowList
    /// @param _transactionId the transaction id associated with the operation
    /// @param _swaps Array of data used to execute swaps
    /// @param _leftoverReceiver Address to send leftover tokens to
    /// @param _initialBalances Array of initial balances
    function _executeSwaps(
        bytes32 _transactionId,
        LibSwap.SwapData[] memory _swaps,
        address payable _leftoverReceiver,
        uint256[] memory _initialBalances
    ) internal noLeftovers(_swaps, _leftoverReceiver, _initialBalances) {
        uint256 numSwaps = _swaps.length;
        for (uint256 i = 0; i < numSwaps; ) {
            LibSwap.SwapData memory currentSwap = _swaps[i];
            require(authentication(currentSwap.sendingAssetId,currentSwap.approveTo,currentSwap.callTo,LibAsset._getFirst4Bytes(currentSwap.callData)));
            LibSwap.swap(_transactionId, currentSwap);
            unchecked {
                ++i;
            }
        }
    }

    /// @dev Executes swaps and checks that DEXs used are in the allowList
    /// @param _reserveData Data passed used to reserve native tokens
    /// @param _swaps Array of data used to execute swaps
    function _executeSwaps(
        ReserveData memory _reserveData,
        LibSwap.SwapData[] memory _swaps,
        uint256[] memory _initialBalances
    )
        internal
        noLeftoversReserve(
            _swaps,
            _reserveData.leftoverReceiver,
            _initialBalances,
            _reserveData.nativeReserve
        )
    {
        uint256 numSwaps = _swaps.length;
        for (uint256 i = 0; i < numSwaps; ) {
            LibSwap.SwapData memory currentSwap = _swaps[i];

            require(authentication(currentSwap.sendingAssetId,currentSwap.approveTo,currentSwap.callTo,LibAsset._getFirst4Bytes(currentSwap.callData)));

            // require(((LibAsset.isNativeAsset(currentSwap.sendingAssetId) ||
            //         LibAllowList.contractIsAllowed(currentSwap.approveTo)) &&
            //         LibAllowList.contractIsAllowed(currentSwap.callTo) &&
            //         LibAllowList.selectorIsAllowed(
            //             LibBytes.getFirst4Bytes(currentSwap.callData)
            //         )),"");

            LibSwap.swap(_reserveData.transactionId, currentSwap);

            unchecked {
                ++i;
            }
        }
    }

    /// @dev Fetches balances of tokens to be swapped before swapping.
    /// @param _swaps Array of data used to execute swaps
    /// @return uint256[] Array of token balances.
    function _fetchBalances(
        LibSwap.SwapData[] memory _swaps
    ) private view returns (uint256[] memory) {
        uint256 numSwaps = _swaps.length;
        uint256[] memory balances = new uint256[](numSwaps);
        address asset;
        for (uint256 i = 0; i < numSwaps; ) {
            asset = _swaps[i].receivingAssetId;
            balances[i] = LibAsset._getBalance(asset,address(this));

            if (LibAsset._isNative(asset)) {
                balances[i] -= msg.value;
            }

            unchecked {
                ++i;
            }
        }

        return balances;
    }

    


    function depositAssets(LibSwap.SwapData[] memory swaps,address _integrator) internal {
        for (uint256 i = 0; i < swaps.length; ) {
            LibSwap.SwapData memory swap = swaps[i];
            if (swap.requiresDeposit) {
                swap.fromAmount -= calcTokenFees(swap.fromAmount,_integrator);
                depositAsset(swap.sendingAssetId, swap.fromAmount);
            }
            unchecked {
                i++;
            }
        }
    }
    function depositAsset(address assetId,uint256 amount) internal {
        if (LibAsset._isNative(assetId)) {
            require(msg.value >= amount,"E17");
        } else {
            require(amount > 0,"E18");
            SafeERC20.safeTransferFrom(
                IERC20(assetId),
                msg.sender,
                address(this),
                amount
            );
        }
    }


    function authentication(address assetId,address _approveTo,address _callTo,bytes4 sig) public virtual returns(bool);

    function calcTokenFees(uint256 _amount,address _integrator)public view virtual returns (uint256 totalFee);
}