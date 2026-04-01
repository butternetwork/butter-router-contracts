// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { IPermit2 } from "../interface/IPermit2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


abstract contract Aggregator {
    using SafeERC20 for IERC20;
    address internal constant ZERO_ADDRESS = address(0);
    address internal constant NATIVE_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    IPermit2 public uniPermit2;
    mapping(bytes4 => bool) public funcBlackList;
    enum DexType {
        AGG,
        UNIV2,
        UNIV3,
        CURVE,
        FILL,
        MIX
    }

    error Aggregator_unsupported_dex_type();
    error Aggregator_swap_failed();
    error Aggregator_native_wrap_failed();
    error Aggregator_call_function_black_list();

    event SetUniPermits(address _uniPermit2);
    constructor(address _uniPermit2) {
        _setUniPermits(_uniPermit2);

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

    function _setUniPermits(address _uniPermit2) internal {
        uniPermit2 = IPermit2(_uniPermit2);
        emit SetUniPermits(_uniPermit2);
    }

    function _execute(
        uint8 _dexType,
        address callTo,
        address _approveTo,
        address _srcToken,
        uint256 _amount,
        bytes calldata _swap
    ) internal {
        bool _result;
        DexType dexType = DexType(_dexType);
        if (dexType == DexType.AGG) {
            (_result) = _makeAggSwap(callTo, _approveTo, _amount, _srcToken, _swap);
        } else if (dexType == DexType.UNIV2) {
            (_result) = _makeUniV2Swap(callTo, _approveTo, _srcToken, _amount, _swap);
        } else if (dexType == DexType.UNIV3) {
            (_result) = _makeUniV3Swap(callTo, _approveTo, _srcToken, _amount, _swap);
        } else if (dexType == DexType.CURVE) {
            (_result) = _makeCurveSwap(callTo, _approveTo, _srcToken, _amount, _swap);
        } else if (dexType == DexType.FILL) {
            (_result) = _makeAggFill(callTo, _approveTo, _srcToken, _amount, _swap);
        } else if (dexType == DexType.MIX) {
            (_result) = _makeMixSwap(_srcToken, _amount, _swap);
        } else {
            revert Aggregator_unsupported_dex_type();
        }
        if(!_result) revert Aggregator_swap_failed();
    }

    struct MixSwap {
        uint256 offset;
        address srcToken;
        address callTo;
        address approveTo;
        bytes callData;
    }

    function _makeMixSwap(
        address _srcToken, 
        uint256 _amount, 
        bytes calldata _swapData
    ) internal returns (bool result) {
        MixSwap[] memory mixSwaps = abi.decode(_swapData, (MixSwap[]));
        uint256 length = mixSwaps.length;

        for (uint256 i = 0; i < length; ) {
            MixSwap memory mix = mixSwaps[i];
            if (i != 0) {
                _srcToken = mix.srcToken;
                _amount = _getBalance(_srcToken, address(this));
            }
            bytes memory callData = mix.callData;
            uint256 offset = mix.offset;
            if (_checkOffset(offset, callData.length)) {
                assembly {
                    mstore(add(callData, offset), _amount)
                }
            }
            _checkApproval(_getFirst4Bytes(callData));
            uint256 value = _approveToken(_srcToken, mix.approveTo, _amount, mix.callTo);
            (result, ) = mix.callTo.call{value: value}(callData);
            if (!result) break;
            unchecked {
                ++i;
            }
        }
    }

    function _makeAggSwap(
        address _callTo,
        address _approveTo,
        uint256 _amount,
        address _token,
        bytes calldata _swap
    ) internal returns (bool _result) {
        bytes4 sig = bytes4(_swap[0:4]);
        _checkApproval(sig);
        uint256 value = _approveToken(_token, _approveTo, _amount, _callTo);
        (_result, ) = _callTo.call{value: value}(_swap);
 
    }

    function _makeAggFill(
        address _callTo,
        address _approveTo,
        address _token,
        uint256 _amount,
        bytes calldata _swapData
    ) internal returns (bool result) {
        (uint256[] memory offsets, bytes memory callData) = abi.decode(_swapData, (uint256[], bytes));
        
        uint256 len = offsets.length;
        uint256 callDataLen = callData.length;
        for (uint i = 0; i < len; ) {
            uint256 offset = offsets[i];
            if (_checkOffset(offset, callDataLen)) {
                assembly {
                    mstore(add(callData, offset), _amount)
                }
            }
            unchecked {
                ++i;
            }
        }
        _checkApproval(_getFirst4Bytes(callData));
        uint256 value = _approveToken(_token, _approveTo, _amount, _callTo);
        (result, ) = _callTo.call{value: value}(callData);
    }

    function _makeUniV2Swap(
        address _callTo,
        address _approveTo,
        address _srcToken,
        uint256 _amount,
        bytes calldata _swap
    ) internal returns (bool _result) {
        (uint256 amountOutMin, address[] memory path) = abi.decode(_swap, (uint256, address[]));
        // if input is native token, path[0] must be wtoken wrap it first
        if(_isNative(_srcToken)) {
           _srcToken = path[0];
           _safeDeposit(_srcToken, _amount);
        }
        uint256 value = _approveToken(_srcToken, _approveTo, _amount, _callTo);
        (_result, ) = _callTo.call{value: value}(
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

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function _makeUniV3Swap(
        address _callTo,
        address _approveTo,
        address _srcToken,
        uint256 _amount,
        bytes calldata _swap
    ) internal returns (bool _result) {
        (uint256 amountOutMin, bytes memory path) = abi.decode(_swap, (uint256, bytes));
        uint256 value = _approveToken(_srcToken, _approveTo, _amount, _callTo);
        address receiver = address(this);
        ExactInputParams memory params = ExactInputParams(path, receiver, _amount, amountOutMin);
        bytes memory swapData = abi.encodeWithSignature("exactInput((bytes,address,uint256,uint256))", params);
        (_result, ) = _callTo.call{value: value}(swapData);
    }

    function _makeCurveSwap(
        address _callTo,
        address _approveTo,
        address _srcToken,
        uint256 _amount,
        bytes calldata _swap
    ) internal returns (bool _result) {
        (uint256 expected, address[9] memory routes, uint256[3][4] memory swap_params, address[4] memory pools) = abi
            .decode(_swap, (uint256, address[9], uint256[3][4], address[4]));
        uint256 value = _approveToken(_srcToken, _approveTo, _amount, _callTo);
        (_result, ) = _callTo.call{value: value}(
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

    function _transfer(uint256 _chainId, address _token, address _to, uint256 _amount) internal {
        if (_isNative(_token)) {
            Address.sendValue(payable(_to), _amount);
        } else {
            if (_chainId == 728126428 && _token == 0xa614f803B6FD780986A42c78Ec9c7f77e6DeD13C) {
                // Tron USDT
                _token.call(abi.encodeWithSelector(0xa9059cbb, _to, _amount));
            } else {
                IERC20(_token).safeTransfer(_to, _amount);
            }
        }
    }

    function _safeDeposit(address _wToken, uint _value) internal {
        (bool success, bytes memory data) = _wToken.call{value: _value}(abi.encodeWithSelector(0xd0e30db0));
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) revert Aggregator_native_wrap_failed();
    }

    function _getFirst4Bytes(bytes memory data) internal pure returns (bytes4 outBytes4) {
        if (data.length == 0) {
            return 0x0;
        }
        assembly {
            outBytes4 := mload(add(data, 32))
        }
    }

    function _checkApproval(bytes4 sig) private view {
        if (funcBlackList[sig]) revert Aggregator_call_function_black_list();
    }

    function _approveToken(address token, address approveTo, uint256 amount, address _callTo) internal returns (uint256 value) {
        if (_isNative(token)) {
            value = amount;
        } else {
            uint256 allowance = IERC20(token).allowance(address(this), approveTo);
            if (allowance < amount) {
                IERC20(token).forceApprove(approveTo, amount);
            }
            IPermit2 permit = uniPermit2;
            if(approveTo == address(permit)) {
                permit.approve(token, _callTo, uint160(amount), uint48(block.timestamp + 1));
            }
        }
    }

    function _checkOffset(uint256 offset, uint256 length) internal pure returns (bool) {
        // offset is relative to the bytes object start (first 32 bytes is length slot).
        // 4bytes funcSig + 32 bytes amount = 36, so offset should be larger than 35.
        // Writing 32 bytes at `offset` is safe when: offset > 35 and offset <= length.
        return offset > 35 && offset<= length;
    }

}
