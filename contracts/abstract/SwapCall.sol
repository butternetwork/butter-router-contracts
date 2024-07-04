// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../lib/Errors.sol";

abstract contract SwapCall {
    using SafeERC20 for IERC20;
    using Address for address;

    address internal immutable wToken;
    address internal constant ZERO_ADDRESS = address(0);
    address internal constant NATIVE_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    uint256 internal nativeBalanceBeforeExec;
    uint256 internal initInputTokenBalance;
    mapping(address => bool) public approved;

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
    }

    function _transferIn(address token,uint256 amount,bytes memory permitData) internal {
        if (amount == 0) revert Errors.ZERO_IN();

        if (permitData.length != 0) {
            _permit(permitData);
        }
        nativeBalanceBeforeExec = address(this).balance - msg.value;
        if (_isNative(token)) {
            if (msg.value < amount) revert Errors.FEE_MISMATCH();
            initInputTokenBalance = nativeBalanceBeforeExec;
        } else {
            initInputTokenBalance = _getBalance(token, address(this));
            SafeERC20.safeTransferFrom(IERC20(token), msg.sender, address(this), amount);
        }
    }

    function _afterCheck() internal {
        if (address(this).balance < nativeBalanceBeforeExec) revert Errors.NATIVE_VALUE_OVERSPEND();
        nativeBalanceBeforeExec = 0;
        initInputTokenBalance = 0;
    }

    function _swap(
        uint256 _amount,
        address _token,
        SwapParam memory swapParam
    ) internal returns (address _dstToken, uint256 _dstAmount) {
        _dstToken = swapParam.dstToken;
        uint256 len = swapParam.swaps.length;
        if (_token == _dstToken) revert Errors.SWAP_SAME_TOKEN();
        if (len == 0) revert Errors.EMPTY();
        (uint256 amountAdjust, uint256 firstAdjust, bool isUp) = _reBuildSwaps(_amount, len, swapParam.swaps);
        uint256 finalTokenAmount = _getBalance(swapParam.dstToken, address(this));
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
                IERC20(_token).safeIncreaseAllowance(_swaps[i].approveTo, _swaps[i].fromAmount);
            }
            _execute(
                _swaps[i].dexType,
                isNative,
                _swaps[i].callTo,
                _token,
                _swaps[i].fromAmount,
                _swaps[i].callData
            );
            if (!isNative) {
                IERC20(_token).safeApprove(_swaps[i].approveTo, 0);
            }
            unchecked {
                i++;
            }
        }
        _dstAmount = _getBalance(swapParam.dstToken, address(this)) - finalTokenAmount;
        if (_dstAmount < swapParam.minAmount) revert Errors.RECEIVE_LOW();
        uint256 left = _getBalance(_token, address(this)) - initInputTokenBalance;
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
        if (offset != 0) {
            assembly {
                mstore(add(callPayload, offset), _amount)
            }
        }
        _checkApprove(callParam.target, callParam.data);
        bool _result;
        if (_isNative(_token)) {
            (_result, ) = callParam.target.call{value: _amount}(callPayload);
        } else {
            if (_amount != 0) IERC20(_token).safeIncreaseAllowance(callParam.approveTo, _amount);
            // this contract not save money make sure send value can cover this
            (_result, ) = callParam.target.call{value: callParam.extraNativeAmount}(callPayload);
            if (_amount != 0) IERC20(_token).safeApprove(callParam.approveTo, 0);
        }
        if (!_result) revert Errors.CALL_BACK_FAIL();
        _callAmount = _callAmount - _getBalance(_token, address(this));
    }

    function _checkApprove(address _callTo, bytes memory _calldata) private view {
        if (_callTo == wToken) {
            bytes4 sig = _getFirst4Bytes(_calldata);
            if (sig != bytes4(0x2e1a7d4d) && sig != bytes4(0xd0e30db0)) revert Errors.NO_APPROVE();
        } else {
            if (!approved[_callTo]) revert Errors.NO_APPROVE();
        }
    }

    function _reBuildSwaps(
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
        } else if(_dexType == DexType.MIX){
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
            bytes memory callDatas = mixSwaps[i].callData;
            uint256 offset = mixSwaps[i].offset;
            if (offset != 0) {
                assembly {
                    mstore(add(callDatas, offset), _amount)
                }
            }
            _checkApprove(mixSwaps[i].callTo, callDatas);
            if (_isNative(_srcToken)) {
                (_result, ) = mixSwaps[i].callTo.call{value: _amount}(callDatas);
            } else {
                if (i != 0) {
                    IERC20(_srcToken).safeIncreaseAllowance(mixSwaps[i].approveTo, _amount);
                }

                (_result, ) = mixSwaps[i].callTo.call(callDatas);

                if (i != 0) {
                    IERC20(_srcToken).safeApprove(mixSwaps[i].approveTo, 0);
                }
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
        (uint256[] memory offsets, bytes memory callDatas) = abi.decode(_swapData, (uint256[], bytes));
        uint256 len = offsets.length;
        for (uint i = 0; i < len; i++) {
            uint256 offset = offsets[i];
            if (offset != 0) {
                assembly {
                    mstore(add(callDatas, offset), _amount)
                }
            }
        }
        _checkApprove(_router, callDatas);
        if (native) {
            (_result, ) = _router.call{value: _amount}(callDatas);
        } else {
            (_result, ) = _router.call(callDatas);
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

    function _safeWithdraw(address _wToken, uint _value) internal returns (bool) {
        (bool success, bytes memory data) = _wToken.call(abi.encodeWithSelector(0x2e1a7d4d, _value));
        return (success && (data.length == 0 || abi.decode(data, (bool))));
    }

    function _getFirst4Bytes(bytes memory data) internal pure returns (bytes4 outBytes4) {
        if (data.length == 0) {
            return 0x0;
        }
        assembly {
            outBytes4 := mload(add(data, 32))
        }
    }

    function _permit(bytes memory _data) internal {
        (
            address token,
            address owner,
            address spender,
            uint256 value,
            uint256 deadline,
            uint8 v,
            bytes32 r,
            bytes32 s
        ) = abi.decode(_data, (address, address, address, uint256, uint256, uint8, bytes32, bytes32));

        SafeERC20.safePermit(IERC20Permit(token), owner, spender, value, deadline, v, r, s);
    }
}
