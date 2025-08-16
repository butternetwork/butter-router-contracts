// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../lib/Errors.sol";

abstract contract SwapCallV2 {
    using SafeERC20 for IERC20;
    using Address for address;

    address internal constant ZERO_ADDRESS = address(0);
    address internal constant NATIVE_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address immutable wToken;

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
        if (!_wToken.isContract()) revert Errors.NOT_CONTRACT();
        wToken = _wToken;
        // _setWToken(_wToken);
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

    function _afterCheck(uint256 nativeBalanceBeforeExec) internal view {
        if (address(this).balance < nativeBalanceBeforeExec) revert Errors.NATIVE_VALUE_OVERSPEND();
    }

    function _swap(
        address _token,
        uint256 _amount,
        uint256 _initBalance,
        bytes calldata _swapData
    ) internal returns (address dstToken, uint256 dstAmount, address receiver) {
        SwapParam memory swapParam = abi.decode(_swapData, (SwapParam));
        receiver = swapParam.receiver;
        dstToken = swapParam.dstToken;
        if (_token == dstToken) revert Errors.SWAP_SAME_TOKEN();
        address self = address(this);
        uint256 finalTokenAmount = _getBalance(dstToken, self);
        _doSwap(_token, _amount, swapParam.swaps);
        dstAmount = _getBalance(dstToken, self) - finalTokenAmount;
        if (dstAmount < swapParam.minAmount) revert Errors.RECEIVE_LOW();
        uint256 left = _getBalance(_token, self) - _initBalance;
        if (left != 0) {
            _transfer(_token, swapParam.leftReceiver, left);
        }
    }

    function _callBack(
        uint256 _amount,
        address _token,
        bytes calldata _callbackData
    ) internal returns (uint256 callAmount, address receiver, address target) {
        CallbackParam memory callParam = abi.decode(_callbackData, (CallbackParam));
        receiver = callParam.receiver;
        target = callParam.target;
        address self = address(this);
        callAmount = _getBalance(_token, self);
        uint256 offset = callParam.offset;
        bytes memory callPayload = callParam.data;
        if (offset > 35) {
            //32 length + 4 funcSig
            assembly {
                mstore(add(callPayload, offset), _amount)
            }
        }
        bytes4 sig;
        assembly {
            sig := mload(add(callPayload, 32))
        }
        _checkApproval(target, sig);
        uint256 value = callParam.extraNativeAmount + _approveToken(_token, callParam.approveTo, _amount);
        (bool result, ) = target.call{value: value}(callPayload);
        if (!result) revert Errors.CALL_BACK_FAIL();
        callAmount = callAmount - _getBalance(_token, self);
    }

    function _checkApproval(address _callTo, bytes4 sig) private view {
        address wTokenAddr = wToken;
        if (_callTo != wTokenAddr && (!approved[_callTo])) revert Errors.NO_APPROVE();

        if (funcBlackList[sig]) revert Errors.CALL_FUNC_BLACK_LIST();

        if (_callTo == wTokenAddr) {
            if (sig != bytes4(0x2e1a7d4d) && sig != bytes4(0xd0e30db0)) revert Errors.CALL_FUNC_BLACK_LIST();
        }
    }

    function _doSwap(address _token, uint256 _amount, SwapData[] memory _swaps) internal {
        uint256 len = _swaps.length;
        if (len == 0) revert Errors.EMPTY();
        (uint256 amountAdjust, uint256 firstAdjust, bool isUp) = _rebuildSwaps(_amount, len, _swaps);
        bool needAdjust = (firstAdjust != 0);
        for (uint i = 0; i < len; ) {
            SwapData memory swap = _swaps[i];
            uint256 amount = swap.fromAmount;
            if (needAdjust) {
                if (i == 0) {
                    isUp ? amount += firstAdjust : amount -= firstAdjust;
                } else {
                    isUp ? amount += amountAdjust : amount -= amountAdjust;
                }
            }

            bool result;
            DexType dexType = swap.dexType;
            if (dexType == DexType.FILL) {
                result = _makeAggFill(_token, swap.callTo, amount, swap.callData);
            } else if (dexType == DexType.MIX) {
                result = _makeMixSwap(_token, amount, swap.callData);
            } else {
                revert Errors.UNSUPPORT_DEX_TYPE();
            }
            if (!result) revert Errors.SWAP_FAIL();
            unchecked {
                ++i;
            }
        }
    }

    function _rebuildSwaps(
        uint256 _amount,
        uint256 _len,
        SwapData[] memory _swaps
    ) private pure returns (uint256 amountAdjust, uint256 firstAdjust, bool isUp) {
        uint256 total = 0;
        for (uint256 i = 0; i < _len; ) {
            total += _swaps[i].fromAmount;
            unchecked {
                ++i;
            }
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

    struct MixSwap {
        uint256 offset;
        address srcToken;
        address callTo;
        address approveTo;
        bytes callData;
    }

    function _makeMixSwap(address _srcToken, uint256 _amount, bytes memory _swapData) internal returns (bool result) {
        MixSwap[] memory mixSwaps = abi.decode(_swapData, (MixSwap[]));
        uint256 length = mixSwaps.length;
        address self = address(this);

        for (uint256 i = 0; i < length; ) {
            MixSwap memory mix = mixSwaps[i];
            if (i != 0) {
                _srcToken = mix.srcToken;
                _amount = _getBalance(_srcToken, self);
            }
            bytes memory callData = mix.callData;
            uint256 offset = mix.offset;
            if (offset > 35) {
                //32 length + 4 funcSig
                assembly {
                    mstore(add(callData, offset), _amount)
                }
            }
            bytes4 sig;
            assembly {
                sig := mload(add(callData, 32))
            }
            address target = mix.callTo;
            _checkApproval(target, sig);
            uint256 value = _approveToken(_srcToken, mix.approveTo, _amount);
            (result, ) = target.call{value: value}(callData);
            if (!result) break;
            unchecked {
                ++i;
            }
        }
    }

    function _makeAggFill(
        address _token,
        address _router,
        uint256 _amount,
        bytes memory _swapData
    ) internal returns (bool result) {
        (uint256[] memory offsets, bytes memory callData) = abi.decode(_swapData, (uint256[], bytes));
        uint256 len = offsets.length;

        for (uint i = 0; i < len; ) {
            uint256 offset = offsets[i];
            if (offset > 35) {
                //32 length + 4 funcSig
                assembly {
                    mstore(add(callData, offset), _amount)
                }
            }
            unchecked {
                ++i;
            }
        }
        bytes4 sig;
        assembly {
            sig := mload(add(callData, 32))
        }
        _checkApproval(_router, sig);
        uint256 value = _approveToken(_token, _router, _amount);
        (result, ) = _router.call{value: value}(callData);
    }

    function _approveToken(address token, address spender, uint256 amount) internal returns (uint256 value) {
        if (_isNative(token)) {
            value = amount;
        } else {
            uint256 allowance = IERC20(token).allowance(address(this), spender);
            if (allowance < amount) {
                IERC20(token).forceApprove(spender, amount);
            }
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
}
