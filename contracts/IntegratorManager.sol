// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./interface/IFeeManager.sol";
import "./interface/IButterRouterV3.sol";
import "./lib/ErrorMessage.sol";
import "./lib/Helper.sol";
import "./abstract/FeeManager.sol";

contract IntegratorManager is FeeManager {

    struct FeeInfo {
        address receiver;
        uint256 fixedNative;
        uint256 tokenFeeRate;
        uint256 routerShare; // router share
        uint256 routerNativeShare;
    }

    // Integrator -> IntegratorFeeInfo
    mapping(address => FeeInfo) public feeInfoList;

    event SetIntegratorFeeRate(
        address indexed integrator,
        address indexed receiver,
        uint256 fixedNative,
        uint256 tokenRate,
        uint256 routerShare,
        uint256 routerNativeShare
    );

    constructor(address _owner) FeeManager(_owner) payable {
        require(_owner != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);
    }

    function setRouterFee(
        address _receiver,
        uint256 _fixedNative,
        uint256 _tokenRate,
        uint256 _routerShare,
        uint256 _routerNativeShare
    ) external onlyOwner {
        _setFeeRate(Helper.ZERO_ADDRESS, _receiver, _fixedNative, _tokenRate, _routerShare, _routerNativeShare);
    }

    function setIntegratorFee(
        address _integrator,
        address _receiver,
        uint256 _fixedNative,
        uint256 _tokenRate,
        uint256 _routerShare,
        uint256 _routerNativeShare
    ) external onlyOwner {
        require(_integrator != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);

        _setFeeRate(_integrator, _receiver, _fixedNative, _tokenRate, _routerShare, _routerNativeShare);
    }

    function getFeeDetail(
        address _inputToken,
        uint256 _inputAmount,
        bytes calldata _feeData
    ) external view override returns (FeeDetail memory feeDetail) {
        IButterRouterV3.Fee memory fee = _checkFeeData(_feeData);
        if (feeReceiver == address(0) && fee.referrer == address(0)) {
            return feeDetail;
        }

        feeDetail.feeToken = _inputToken;

        FeeInfo memory info = feeInfoList[fee.referrer];
        if (info.receiver == Helper.ZERO_ADDRESS) {
            // not integrator
            info = feeInfoList[Helper.ZERO_ADDRESS];
            if (info.receiver == Helper.ZERO_ADDRESS) {
                // no router fee
                feeDetail.integratorTokenFee = (_inputAmount * fee.rateOrNativeFee) / FEE_DENOMINATOR;
                return feeDetail;
            }
            if (info.tokenFeeRate == 0) {
                if (info.fixedNative != 0) {
                    feeDetail.routerNativeFee = (info.fixedNative * info.routerNativeShare) / FEE_DENOMINATOR;
                    feeDetail.integratorNativeFee = info.fixedNative - feeDetail.routerNativeFee;
                }
            } else {
                feeDetail.routerNativeFee = info.fixedNative;
            }
        } else {
            if (info.fixedNative != 0) {
                feeDetail.routerNativeFee = (info.fixedNative * info.routerNativeShare) / FEE_DENOMINATOR;
                feeDetail.integratorNativeFee = info.fixedNative - feeDetail.routerNativeFee;
            }
        }

        uint256 feeRate;
        uint256 routerRate;
        if (fee.rateOrNativeFee == 0) {
            feeRate = info.tokenFeeRate * FEE_DENOMINATOR;
            routerRate = info.tokenFeeRate * info.routerShare;
        } else if (fee.rateOrNativeFee >= info.tokenFeeRate) {
            feeRate = fee.rateOrNativeFee * FEE_DENOMINATOR;
            routerRate = fee.rateOrNativeFee * info.routerShare;
        } else {
            feeRate = fee.rateOrNativeFee * FEE_DENOMINATOR;
            routerRate = info.tokenFeeRate * info.routerShare;
            if (feeRate < routerRate) {
                feeRate = routerRate;
            }
        }

        if (feeRate > 0) {
            uint256 totalFee = (_inputAmount * feeRate) / FEE_DENOMINATOR / FEE_DENOMINATOR;
            feeDetail.routerTokenFee = (_inputAmount * routerRate) / FEE_DENOMINATOR / FEE_DENOMINATOR;
            feeDetail.integratorTokenFee = totalFee - feeDetail.routerTokenFee;
        }
        feeDetail.routerReceiver = info.receiver;
    }

    function getAmountBeforeFee(
        address _inputToken,
        uint256 _inputAmount,
        bytes calldata _feeData
    ) external view override returns (address feeToken, uint256 beforeAmount, uint256 nativeFeeAmount) {
        IButterRouterV3.Fee memory fee = _checkFeeData(_feeData);
        require(fee.feeType == IButterRouterV3.FeeType.PROPORTION, "Only proportion");
        feeToken = _inputToken;

        uint256 feeRate;

        FeeInfo memory info = feeInfoList[fee.referrer];
        if (info.receiver == Helper.ZERO_ADDRESS) {
            info = feeInfoList[Helper.ZERO_ADDRESS];
        }
        if (info.receiver == Helper.ZERO_ADDRESS) {
            feeRate = fee.rateOrNativeFee * FEE_DENOMINATOR;
        } else {
            if (fee.rateOrNativeFee == 0) {
                feeRate = info.tokenFeeRate * FEE_DENOMINATOR;
            } else if (fee.rateOrNativeFee >= info.tokenFeeRate) {
                feeRate = fee.rateOrNativeFee * FEE_DENOMINATOR;
            } else {
                feeRate = fee.rateOrNativeFee * FEE_DENOMINATOR;
                uint256 routerRate = (info.tokenFeeRate * info.routerShare);
                if (feeRate < routerRate) {
                    feeRate = routerRate;
                }
            }
        }

        if (Helper._isNative(_inputToken)) {
            _inputAmount += info.fixedNative;
        }

        if (feeRate > 0) {
            beforeAmount =
                (_inputAmount * FEE_DENOMINATOR * FEE_DENOMINATOR) /
                (FEE_DENOMINATOR * FEE_DENOMINATOR - feeRate) +
                1;
        } else {
            beforeAmount = _inputAmount;
        }
    }

    function _setFeeRate(
        address integrator,
        address _receiver,
        uint256 _fixedNative,
        uint256 _tokenRate,
        uint256 _routerShare,
        uint256 _routerNativeShare
    ) internal {
        require(_receiver != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);
        require(_tokenRate < FEE_DENOMINATOR, "FeeManager: invalid tokenFeeRate");
        require(_routerShare <= FEE_DENOMINATOR, "FeeManager: invalid  routerShare");
        require(_routerNativeShare <= FEE_DENOMINATOR, "FeeManager: invalid  routerNativeShare");

        FeeInfo storage routerFee = feeInfoList[integrator];
        routerFee.receiver = _receiver;
        routerFee.fixedNative = _fixedNative;
        routerFee.tokenFeeRate = _tokenRate;
        routerFee.routerShare = _routerShare;
        routerFee.routerNativeShare = _routerNativeShare;

        emit SetIntegratorFeeRate(integrator, _receiver, _fixedNative, _tokenRate, _routerShare, _routerNativeShare);
    }
}
