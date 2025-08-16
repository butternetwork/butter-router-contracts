// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../lib/Errors.sol";

abstract contract SwapCall {
    using SafeERC20 for IERC20;
    using Address for address;

    address internal constant ZERO_ADDRESS = address(0);
    address internal constant NATIVE_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address public wToken;
    // uint256 internal nativeBalanceBeforeExec;
    // uint256 internal initInputTokenBalance;
    mapping(address => bool) public approved;
    mapping(bytes4 => bool) public funcBlackList;
    event EditFuncBlackList(bytes4 _func, bool flag);
    event SetWrappedToken(address indexed _wToken);

    enum DexType {
        AGG,
        UNIV2,
        UNIV3,
        CURVE,
        FILL,
        MIX
    }

    struct CallbackParam {
        address target;
        address approveTo;
        uint256 offset;
        uint256 extraNativeAmount;
        address receiver;
        bytes data;
    }

    struct SwapParam {
        address dstToken;
        address receiver;
        address leftReceiver;
        uint256 minAmount;
        SwapData[] swaps;
    }

    struct SwapData {
        DexType dexType;
        address callTo;
        address approveTo;
        uint256 fromAmount;
        bytes callData;
    }

    constructor(address _wToken) payable {
        _setWToken(_wToken);
        //| a9059cbb | transfer(address,uint256)
        funcBlackList[bytes4(0xa9059cbb)] = true;
        //| 095ea7b3 | approve(address,uint256) |
        funcBlackList[bytes4(0x095ea7b3)] = true;
        //| 23b872dd | transferFrom(address,address,uint256) |
        funcBlackList[bytes4(0x23b872dd)] = true;
        //| 39509351 | increaseAllowance(address,uint256)
        funcBlackList[bytes4(0x39509351)] = true;
        //| a22cb465 | setApprovalForAll(address,bool) |
        funcBlackList[bytes4(0xa22cb465)] = true;
        //| 42842e0e | safeTransferFrom(address,address,uint256) |
        funcBlackList[bytes4(0x42842e0e)] = true;
        //| b88d4fde | safeTransferFrom(address,address,uint256,bytes) |
        funcBlackList[bytes4(0xb88d4fde)] = true;
        //| 9bd9bbc6 | send(address,uint256,bytes) |
        funcBlackList[bytes4(0x9bd9bbc6)] = true;
        //| fe9d9303 | burn(uint256,bytes) |
        funcBlackList[bytes4(0xfe9d9303)] = true;
        //| 959b8c3f | authorizeOperator
        funcBlackList[bytes4(0x959b8c3f)] = true;
        //| f242432a | safeTransferFrom(address,address,uint256,uint256,bytes) |
        funcBlackList[bytes4(0xf242432a)] = true;
        //| 2eb2c2d6 | safeBatchTransferFrom(address,address,uint256[],uint256[],bytes) |
        funcBlackList[bytes4(0x2eb2c2d6)] = true;
    }

    function _editFuncBlackList(bytes4 _func, bool _flag) internal {
        funcBlackList[_func] = _flag;
        emit EditFuncBlackList(_func, _flag);
    }

    function _setWToken(address _wToken) internal {
        if (!_wToken.isContract()) revert Errors.NOT_CONTRACT();
        wToken = _wToken;
        emit SetWrappedToken(_wToken);
    }

    function _afterCheck(uint256 nativeBalanceBeforeExec) internal view {
        if (address(this).balance < nativeBalanceBeforeExec) revert Errors.NATIVE_VALUE_OVERSPEND();
    }

    function _swap(
        address _token,
        uint256 _amount,
        uint256 _initBalance,
        SwapParam memory swapParam
    ) internal returns (address _dstToken, uint256 _dstAmount) {
        _dstToken = swapParam.dstToken;
        if (_token == _dstToken) revert Errors.SWAP_SAME_TOKEN();

        uint256 finalTokenAmount = _getBalance(swapParam.dstToken, address(this));
        _doSwap(_token, _amount, swapParam);
        _dstAmount = _getBalance(swapParam.dstToken, address(this)) - finalTokenAmount;
        if (_dstAmount < swapParam.minAmount) revert Errors.RECEIVE_LOW();
        uint256 left = _getBalance(_token, address(this)) - _initBalance;
        if (left != 0) {
            _transfer(_token, swapParam.leftReceiver, left);
        }
    }

    function _callBack(
        uint256 _amount,
        address _token,
        CallbackParam memory callParam
    ) internal returns (uint256 _callAmount) {
        _callAmount = _getBalance(_token, address(this));
        uint256 offset = callParam.offset;
        bytes memory callPayload = callParam.data;
        if (offset > 35) {
            //32 length + 4 funcSig
            assembly {
                mstore(add(callPayload, offset), _amount)
            }
        }
        _checkApprove(callParam.target, callPayload);
        bool _result;
        if (_isNative(_token)) {
            (_result, ) = callParam.target.call{value: _amount}(callPayload);
        } else {
            if (_amount != 0) IERC20(_token).forceApprove(callParam.approveTo, _amount);
            // this contract not save money make sure send value can cover this
            (_result, ) = callParam.target.call{value: callParam.extraNativeAmount}(callPayload);
            // if (_amount != 0) IERC20(_token).safeApprove(callParam.approveTo, 0);
        }
        if (!_result) revert Errors.CALL_BACK_FAIL();
        _callAmount = _callAmount - _getBalance(_token, address(this));
    }

    function _checkApprove(address _callTo, bytes memory _calldata) private view {
        address wTokenAddr = wToken;
        if (_callTo != wTokenAddr && (!approved[_callTo])) revert Errors.NO_APPROVE();

        bytes4 sig = _getFirst4Bytes(_calldata);
        if (funcBlackList[sig]) revert Errors.CALL_FUNC_BLACK_LIST();

        if (_callTo == wTokenAddr) {
            if (sig != bytes4(0x2e1a7d4d) && sig != bytes4(0xd0e30db0)) revert Errors.CALL_FUNC_BLACK_LIST();
        }
    }

    function _doSwap(address _token, uint256 _amount, SwapParam memory swapParam) internal {
        uint256 len = swapParam.swaps.length;
        if (len == 0) revert Errors.EMPTY();
        (uint256 amountAdjust, uint256 firstAdjust, bool isUp) = _rebuildSwaps(_amount, len, swapParam.swaps);
        SwapData[] memory _swaps = swapParam.swaps;
        bool isNative = _isNative(_token);
        for (uint i = 0; i < len; ) {
            if (firstAdjust != 0) {
                if (i == 0) {
                    isUp ? _swaps[i].fromAmount += firstAdjust : _swaps[i].fromAmount -= firstAdjust;
                } else {
                    isUp ? _swaps[i].fromAmount += amountAdjust : _swaps[i].fromAmount -= amountAdjust;
                }
            }
            if (!isNative) {
                IERC20(_token).forceApprove(_swaps[i].approveTo, _swaps[i].fromAmount);
            }
            _execute(_swaps[i].dexType, isNative, _swaps[i].callTo, _token, _swaps[i].fromAmount, _swaps[i].callData);
            // if (!isNative) {
            //     IERC20(_token).safeApprove(_swaps[i].approveTo, 0);
            // }
            unchecked {
                i++;
            }
        }
    }

    function _rebuildSwaps(
        uint256 _amount,
        uint256 _len,
        SwapData[] memory _swaps
    ) private pure returns (uint256 amountAdjust, uint256 firstAdjust, bool isUp) {
        uint256 total = 0;
        for (uint256 i = 0; i < _len; i++) {
            total += _swaps[i].fromAmount;
        }
        if (total > _amount) {
            isUp = false;
            uint256 margin = total - _amount;
            amountAdjust = margin / _len;
            firstAdjust = amountAdjust + (margin - amountAdjust * _len);
        } else if (total < _amount) {
            isUp = true;
            uint256 margin = _amount - total;
            amountAdjust = margin / _len;
            firstAdjust = amountAdjust + (margin - amountAdjust * _len);
        }
    }

    function _execute(
        DexType _dexType,
        bool _native,
        address _router,
        address _srcToken,
        uint256 _amount,
        bytes memory _swapData
    ) internal {
        bool _result;
        if (_dexType == DexType.FILL) {
            (_result) = _makeAggFill(_router, _amount, _native, _swapData);
        } else if (_dexType == DexType.MIX) {
            (_result) = _makeMixSwap(_srcToken, _amount, _swapData);
        } else {
            revert Errors.UNSUPPORT_DEX_TYPE();
        }
        if (!_result) revert Errors.SWAP_FAIL();
    }

    struct MixSwap {
        uint256 offset;
        address srcToken;
        address callTo;
        address approveTo;
        bytes callData;
    }

    function _makeMixSwap(address _srcToken, uint256 _amount, bytes memory _swapData) internal returns (bool _result) {
        MixSwap[] memory mixSwaps = abi.decode(_swapData, (MixSwap[]));
        for (uint256 i = 0; i < mixSwaps.length; i++) {
            if (i != 0) {
                _amount = _getBalance(mixSwaps[i].srcToken, address(this));
                _srcToken = mixSwaps[i].srcToken;
            }
            bytes memory callData = mixSwaps[i].callData;
            uint256 offset = mixSwaps[i].offset;
            if (offset > 35) {
                //32 length + 4 funcSig
                assembly {
                    mstore(add(callData, offset), _amount)
                }
            }
            _checkApprove(mixSwaps[i].callTo, callData);
            if (_isNative(_srcToken)) {
                (_result, ) = mixSwaps[i].callTo.call{value: _amount}(callData);
            } else {
                if (i != 0) {
                    IERC20(_srcToken).forceApprove(mixSwaps[i].approveTo, _amount);
                }

                (_result, ) = mixSwaps[i].callTo.call(callData);

                // if (i != 0) {
                //     IERC20(_srcToken).safeApprove(mixSwaps[i].approveTo, 0);
                // }
            }
            if (!_result) {
                break;
            }
        }
    }

    function _makeAggFill(
        address _router,
        uint256 _amount,
        bool native,
        bytes memory _swapData
    ) internal returns (bool _result) {
        (uint256[] memory offsets, bytes memory callData) = abi.decode(_swapData, (uint256[], bytes));
        uint256 len = offsets.length;
        for (uint i = 0; i < len; i++) {
            uint256 offset = offsets[i];
            if (offset > 35) {
                //32 length + 4 funcSig
                assembly {
                    mstore(add(callData, offset), _amount)
                }
            }
        }
        _checkApprove(_router, callData);
        if (native) {
            (_result, ) = _router.call{value: _amount}(callData);
        } else {
            (_result, ) = _router.call(callData);
        }
    }

    function _isNative(address token) internal pure returns (bool) {
        return (token == ZERO_ADDRESS || token == NATIVE_ADDRESS);
    }

    function _getBalance(address _token, address _account) internal view returns (uint256) {
        if (_isNative(_token)) {
            return _account.balance;
        } else {
            return IERC20(_token).balanceOf(_account);
        }
    }

    function _transfer(address _token, address _to, uint256 _amount) internal {
        if (_isNative(_token)) {
            Address.sendValue(payable(_to), _amount);
        } else {
            uint256 _chainId = block.chainid;
            if (_chainId == 728126428 && _token == 0xa614f803B6FD780986A42c78Ec9c7f77e6DeD13C) {
                // Tron USDT
                _token.call(abi.encodeWithSelector(0xa9059cbb, _to, _amount));
            } else {
                IERC20(_token).safeTransfer(_to, _amount);
            }
        }
    }

    function _getFirst4Bytes(bytes memory data) internal pure returns (bytes4 outBytes4) {
        if (data.length == 0) {
            return 0x0;
        }
        assembly {
            outBytes4 := mload(add(data, 32))
        }
    }
}
