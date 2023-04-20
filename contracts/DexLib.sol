// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library DexLib {
    using SafeERC20 for IERC20;

    address internal constant ZERO_ADDRESS = address(0);

    address internal constant NATIVE_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    function _makeUniV2Swap(
        address _router,
        uint256 _amount,
        bytes memory _swap
    )
        internal
        returns (bool _result, address _dstToken, uint256 _returnAmount)
    {
        (uint256 amountOutMin, address[] memory path, address dstToken) = abi
            .decode(_swap, (uint256, address[], address));
        _dstToken = dstToken;
        _returnAmount = _getBalance(_dstToken, address(this));
        if (_isNative(dstToken)) {
            (_result, ) = _router.call(
                abi.encodeWithSignature(
                    "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
                    _amount,
                    amountOutMin,
                    path,
                    address(this),
                    block.timestamp + 100
                )
            );
        } else {
            (_result, ) = _router.call(
                abi.encodeWithSignature(
                    "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                    _amount,
                    amountOutMin,
                    path,
                    address(this),
                    block.timestamp + 100
                )
            );
        }

        _returnAmount = _getBalance(_dstToken, address(this));
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function _makeUniV3Swap(
        address _router,
        uint256 _amount,
        bytes memory _swap
    )
        internal
        returns (bool _result, address _dstToken, uint256 _returnAmount)
    {
        (uint256 amountOutMin, bytes memory path, address dstToken) = abi
            .decode(_swap, (uint256, bytes, address));
        _dstToken = dstToken;
        _returnAmount = _getBalance(_dstToken, address(this));
        ExactInputParams memory params = ExactInputParams(
            path,
            address(this),
            _amount,
            amountOutMin
        );

        bytes memory swapData = abi.encodeWithSignature("exactInput((bytes,address,uint256,uint256))",params);
        if (_isNative(_dstToken)) {
            params.recipient = _router;
            bytes[] memory c = new bytes[](2);
            c[0] = swapData;
            c[1] = abi.encodeWithSignature("unwrapWETH9(uint256,address)",amountOutMin,address(this));
            (_result, ) = _router.call( abi.encodeWithSignature("multicall(bytes[])", c));
        } else {
            (_result, ) = _router.call(swapData);
        }

        _returnAmount = _getBalance(_dstToken, address(this));
    }

    function _makeCurveSwap(
        address _router,
        uint256 _amount,
        bytes memory _swap
    )
        internal
        returns (bool _result, address _dstToken, uint256 _returnAmount)
    {
        (
            uint256 expected,
            address[9] memory routes,
            uint256[3][4] memory swap_params,
            address[4] memory pools,
            address dstToken
        ) = abi.decode(
                _swap,
                (uint256, address[9], uint256[3][4], address[4], address)
            );
        _dstToken = dstToken;
        _returnAmount = _getBalance(_dstToken, address(this));
        (_result, ) = _router.call(
            abi.encodeWithSignature(
                "exchange_multiple(address[9],uint256[3][4],uint256,uint256,address[4],address)",
                routes,
                swap_params,
                _amount,
                expected,
                pools,
                address(this)
            )
        );
        _returnAmount = _getBalance(_dstToken, address(this));
    }

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
}
