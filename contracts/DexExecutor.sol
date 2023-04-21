// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interface/IExecutor.sol";
import "./lib/Helper.sol";

contract DexExecutor is IExecutor {
    using SafeERC20 for IERC20;

    function execute(
        DexType dexType,
        address _router,
        address _dstToken,
        uint256 _amount,
        bool _isNative,
        bytes memory _swap
    ) external override returns (bool _result,uint256 _returnAmount) {
        if (dexType == DexType.AGG) {
            (_result, _returnAmount) = _makeAggSwap(
                _router,
                _dstToken,
                _amount,
                _isNative,
                _swap
            );
        } else if (dexType == DexType.UNIV2) {
            (_result, _returnAmount) = _makeUniV2Swap(
                _router,
                _dstToken,
                _amount,
                _isNative,
                _swap
            );
        } else if (dexType == DexType.UNIV3) {
            (_result, _returnAmount) = _makeUniV3Swap(
                _router,
                _dstToken,
                _amount,
                _isNative,
                _swap
            );
        } else if (dexType == DexType.CURVE) {
            (_result, _returnAmount) = _makeCurveSwap(
                _router,
                _dstToken,
                _amount,
                _isNative,
                _swap
            );
        } else {
           _result = false;
        }
    }

    function _makeAggSwap(
        address _router,
        address _dstToken,
        uint256 _amount,
        bool _isNative,
        bytes memory _swap
    ) internal returns (bool _result, uint256 _returnAmount) {
        _returnAmount = Helper._getBalance(_dstToken, address(this));
        if (_isNative) {
            (_result, ) = _router.call{value: _amount}(_swap);
        } else {
            (_result, ) = _router.call(_swap);
        }
        _returnAmount = Helper._getBalance(_dstToken, address(this)) -_returnAmount;
    }

    function _makeUniV2Swap(
        address _router,
        address _dstToken,
        uint256 _amount,
        bool _isNative,
        bytes memory _swap
    ) internal returns (bool _result, uint256 _returnAmount) {
        (uint256 amountOutMin, address[] memory path,) = abi
            .decode(_swap, (uint256, address[], address));
        _returnAmount = Helper._getBalance(_dstToken, address(this));
        if (_isNative) {
         (_result, ) = _router.call{value:_amount}(
                abi.encodeWithSignature(
                    "swapExactETHForTokens(uint256,address[],address,uint256)",
                    amountOutMin,
                    path,
                    address(this),
                    block.timestamp + 100
                )
            );
        } else if (Helper._isNative(_dstToken)) {
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

        _returnAmount = Helper._getBalance(_dstToken, address(this));
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function _makeUniV3Swap(
        address _router,
        address _dstToken,
        uint256 _amount,
        bool _isNative,
        bytes memory _swap
    ) internal returns (bool _result, uint256 _returnAmount) {
        (uint256 amountOutMin, bytes memory path) = abi
            .decode(_swap, (uint256, bytes));
        _returnAmount = Helper._getBalance(_dstToken, address(this));
        address receiver = Helper._isNative(_dstToken)? _router: address(this);
        ExactInputParams memory params = ExactInputParams(
            path,
            receiver,
            _amount,
            amountOutMin
        );
        bytes memory swapData = abi.encodeWithSignature("exactInput((bytes,address,uint256,uint256))",params);
        uint256 value = _isNative ? _amount : 0;
        if (Helper._isNative(_dstToken)) {
            bytes[] memory c = new bytes[](2);
            c[0] = swapData;
            c[1] = abi.encodeWithSignature("unwrapWETH9(uint256,address)",amountOutMin,address(this));
            (_result, ) = _router.call{value: value}(abi.encodeWithSignature("multicall(bytes[])", c));
        } else {
            (_result, ) = _router.call{value: value}(swapData);
        }
        _returnAmount = Helper._getBalance(_dstToken, address(this));
    }

    function _makeCurveSwap(
        address _router,
        address _dstToken,
        uint256 _amount,
        bool _isNative,
        bytes memory _swap
    ) internal returns (bool _result, uint256 _returnAmount) {
        (
            uint256 expected,
            address[9] memory routes,
            uint256[3][4] memory swap_params,
            address[4] memory pools
        ) = abi.decode(_swap,(uint256, address[9], uint256[3][4], address[4]));
        uint256 value = _isNative ? _amount : 0;
        _returnAmount = Helper._getBalance(_dstToken, address(this));
        (_result, ) = _router.call{value: value}(
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
        _returnAmount = Helper._getBalance(_dstToken, address(this));
    }
}
