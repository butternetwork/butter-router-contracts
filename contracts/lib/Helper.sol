// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

library Helper {
    using SafeERC20 for IERC20;
    address internal constant ZERO_ADDRESS = address(0);
    address internal constant NATIVE_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    
    struct CallbackParam {
        address target;
        address approveTo; 
        uint256 amount;
        uint256 extraNativeAmount;
        address receiver;
        bytes data;
    }

    struct SwapParam {
        uint8 dexType;
        address executor;
        address approveTo; 
        address receiver;
        address dstToken;
        uint256 minReturnAmount;
        bytes data;
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

    function _transfer(address _token,address _to,uint256 _amount) internal {
        if(_isNative(_token)){
             Address.sendValue(payable(_to),_amount);
        }else{
            IERC20(_token).safeTransfer(_to,_amount);
        }
    }

    function _safeWithdraw(address _wToken,uint _value) internal returns(bool) {
        (bool success, bytes memory data) = _wToken.call(abi.encodeWithSelector(0x2e1a7d4d, _value));
        return (success && (data.length == 0 || abi.decode(data, (bool))));
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

        function _makeSwap(uint256 _amount, address _srcToken, SwapParam memory _swap) internal returns(bool _result, address _dstToken, uint256 _returnAmount){
            _dstToken = _swap.dstToken;
            uint256 nativeValue = 0;
            bool isNative = Helper._isNative(_srcToken);
            if (isNative) {
                nativeValue = _amount;
            } else {
                IERC20(_srcToken).safeApprove(_swap.approveTo, 0);
                IERC20(_srcToken).safeApprove(_swap.approveTo, _amount);
            }
            _returnAmount = Helper._getBalance(_dstToken, address(this));

            (_result,) = _swap.executor.call{value:nativeValue}(_swap.data);

            _returnAmount = Helper._getBalance(_dstToken, address(this)) - _returnAmount;
            
            if (!isNative ) {
                IERC20(_srcToken).safeApprove(_swap.approveTo, 0);
            }
    }

    function _callBack(address _token, CallbackParam memory _callParam) internal returns (bool _result, uint256 _callAmount) {

        _callAmount = Helper._getBalance(_token, address(this));

        if (Helper._isNative(_token)) {
            (_result, )  = _callParam.target.call{value: _callParam.amount}(_callParam.data);
        } else {          
            IERC20(_token).safeIncreaseAllowance(_callParam.approveTo, _callParam.amount);
            // this contract not save money make sure send value can cover this
            (_result, )  = _callParam.target.call{value:_callParam.extraNativeAmount}(_callParam.data);
            IERC20(_token).safeApprove(_callParam.approveTo, 0);
        }
        _callAmount = _callAmount - Helper._getBalance(_token, address(this));
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
        ) = abi.decode(
                _data,
                (
                    address,
                    address,
                    address,
                    uint256,
                    uint256,
                    uint8,
                    bytes32,
                    bytes32
                )
            );

        SafeERC20.safePermit(
            IERC20Permit(token),
            owner,
            spender,
            value,
            deadline,
            v,
            r,
            s
        );
    }

}
