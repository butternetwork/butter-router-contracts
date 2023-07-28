// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library LibAsset {
    uint256 private constant MAX_UINT = type(uint256).max;
        using SafeERC20 for IERC20;
    address internal constant ZERO_ADDRESS = address(0);
    address internal constant NATIVE_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;


    function _isNative(address token) internal pure returns (bool) {
        return (token == ZERO_ADDRESS || token == NATIVE_ADDRESS);
    }

    function _getBalance(
        address _token,
        address _account
    ) internal view returns (uint256) {
        if (_isNative(_token)) {
            return _account.balance;
        } else {
            return IERC20(_token).balanceOf(_account);
        }
    }

    function _transfer(address _token,address _to,uint256 _amount) internal {
        if(_isNative(_token)){
             Address.sendValue(payable(_to),_amount);
        }else{
            IERC20(_token).safeTransfer(_to,_amount);
        }
    }

    function _maxApproveERC20(
        IERC20 assetId,
        address spender,
        uint256 amount
    ) internal {
        if (_isNative(address(assetId))) return;
        uint256 allowance = assetId.allowance(address(this), spender);
        if (allowance < amount)
            SafeERC20.safeIncreaseAllowance(
                IERC20(assetId),
                spender,
                MAX_UINT - allowance
            );
    }

    function _getFirst4Bytes(
        bytes memory data
    ) internal pure returns (bytes4 outBytes4) {
        if (data.length == 0) {
            return 0x0;
        }

        assembly {
            outBytes4 := mload(add(data, 32))
        }
    }
}