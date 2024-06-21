// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./interface/IFeeManager.sol";
import "./lib/ErrorMessage.sol";
import "./lib/Helper.sol";

contract FeeManager is Ownable2Step, IFeeManager {
    uint256 constant FEE_DENOMINATOR = 10000;

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

    constructor(address _owner) payable {
        require(_owner != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);
        _transferOwnership(_owner);
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

    function getFee(
        address _integrator,
        address _inputToken,
        uint256 _inputAmount,
        uint256 _feeRate
    ) external view returns (FeeDetail memory feeDetail) {
        require(_feeRate < FEE_DENOMINATOR, "FeeManager: invalid feeRate");
        feeDetail.feeToken = _inputToken;

        FeeInfo memory info = feeInfoList[_integrator];
        if (info.receiver == Helper.ZERO_ADDRESS) {
            // not integrator
            info = feeInfoList[Helper.ZERO_ADDRESS];
            if (info.receiver == Helper.ZERO_ADDRESS) {
                // no router fee
                feeDetail.integratorToken = (_inputAmount * _feeRate) / FEE_DENOMINATOR;
                return feeDetail;
            }
            if (info.tokenFeeRate == 0) {
                if (info.fixedNative != 0) {
                    feeDetail.routerNative = (info.fixedNative * info.routerNativeShare) / FEE_DENOMINATOR;
                    feeDetail.integratorNative = info.fixedNative - feeDetail.routerNative;
                }
            } else {
                feeDetail.routerNative = info.fixedNative;
            }
        } else {
            if (info.fixedNative != 0) {
                feeDetail.routerNative = (info.fixedNative * info.routerNativeShare) / FEE_DENOMINATOR;
                feeDetail.integratorNative = info.fixedNative - feeDetail.routerNative;
            }
        }

        uint256 feeRate;
        uint256 routerRate;
        if (_feeRate == 0) {
            feeRate = info.tokenFeeRate * FEE_DENOMINATOR;
            routerRate = info.tokenFeeRate * info.routerShare;
        } else if (_feeRate >= info.tokenFeeRate) {
            feeRate = _feeRate * FEE_DENOMINATOR;
            routerRate = _feeRate * info.routerShare;
        } else {
            feeRate = _feeRate * FEE_DENOMINATOR;
            routerRate = info.tokenFeeRate * info.routerShare;
            if (feeRate < routerRate) {
                feeRate = routerRate;
            }
        }

        if (feeRate > 0) {
            uint256 fee = (_inputAmount * feeRate) / FEE_DENOMINATOR / FEE_DENOMINATOR;
            feeDetail.routerToken = (_inputAmount * routerRate) / FEE_DENOMINATOR / FEE_DENOMINATOR;
            feeDetail.integratorToken = fee - feeDetail.routerToken;
        }
        feeDetail.routerReceiver = info.receiver;
    }

    function getAmountBeforeFee(
        address _integrator,
        address _inputToken,
        uint256 _inputAmount,
        uint256 _feeRate
    ) external view returns (address feeToken, uint256 beforeAmount) {
        require(_feeRate < FEE_DENOMINATOR);
        feeToken = _inputToken;

        uint256 feeRate;

        FeeInfo memory info = feeInfoList[_integrator];
        if (info.receiver == Helper.ZERO_ADDRESS) {
            info = feeInfoList[Helper.ZERO_ADDRESS];
        }
        if (info.receiver == Helper.ZERO_ADDRESS) {
            feeRate = _feeRate * FEE_DENOMINATOR;
        } else {
            if (_feeRate == 0) {
                feeRate = info.tokenFeeRate * FEE_DENOMINATOR;
            } else if (_feeRate >= info.tokenFeeRate) {
                feeRate = _feeRate * FEE_DENOMINATOR;
            } else {
                feeRate = _feeRate * FEE_DENOMINATOR;
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
