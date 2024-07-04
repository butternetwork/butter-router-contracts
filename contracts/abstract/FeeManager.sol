// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "../interface/IFeeManager.sol";
import "../interface/IButterRouterV3.sol";
import "../lib/Errors.sol";

abstract contract FeeManager is Ownable2Step, IFeeManager {
    uint256 constant FEE_DENOMINATOR = 10000;

    uint256 public routerFeeRate;
    uint256 public routerFixedFee;
    address public feeReceiver;

    uint256 public maxFeeRate;      // referrer max fee rate
    uint256 public maxNativeFee;    // referrer max fixed native fee

    event SetFee(address indexed receiver, uint256 indexed rate, uint256 indexed fixedf);
    event SetReferrerMaxFee(uint256 indexed _maxFeeRate,uint256 indexed _maxNativeFee);

    constructor(address _owner) payable {
        if (_owner == address(0)) revert Errors.ZERO_ADDRESS();
        _transferOwnership(_owner);
    }

    function setFee(address _feeReceiver, uint256 _feeRate, uint256 _fixedFee) external onlyOwner {
        if (_feeReceiver == address(0)) revert Errors.ZERO_ADDRESS();

        require(_feeRate < FEE_DENOMINATOR);

        feeReceiver = _feeReceiver;
        routerFeeRate = _feeRate;
        routerFixedFee = _fixedFee;

        emit SetFee(_feeReceiver, _feeRate, routerFixedFee);
    }

    function setReferrerMaxFee(uint256 _maxFeeRate,uint256 _maxNativeFee) external onlyOwner {
        require(_maxFeeRate < FEE_DENOMINATOR);
        maxFeeRate = _maxFeeRate;
        maxNativeFee = _maxNativeFee;
        emit SetReferrerMaxFee(_maxFeeRate,_maxNativeFee);
    }

    function getFeeDetail(
        address _inputToken,
        uint256 _inputAmount,
        bytes calldata _feeData
    ) external view override virtual returns (FeeDetail memory feeDetail) {
        IButterRouterV3.Fee memory fee = _checkFeeData(_feeData);
        if (feeReceiver == address(0) && fee.referrer == address(0)) {
            return feeDetail;
        }
        feeDetail.feeToken = _inputToken;
        if (feeReceiver != address(0)) {
            feeDetail.routerReceiver = feeReceiver;
            feeDetail.routerNativeFee = routerFixedFee;
            if (_inputToken == address(0)) {
                feeDetail.routerNativeFee += (_inputAmount * routerFeeRate) / FEE_DENOMINATOR;
            } else {
                feeDetail.routerTokenFee = (_inputAmount * routerFeeRate) / FEE_DENOMINATOR;
            }
        }

        if (fee.referrer != address(0)) {
            feeDetail.integrator = fee.referrer;
            if (fee.feeType == IButterRouterV3.FeeType.FIXED) {
                feeDetail.integratorNativeFee = fee.rateOrNativeFee;
            } else {
                if (_inputToken == address(0)) {
                    feeDetail.integratorNativeFee = (_inputAmount * fee.rateOrNativeFee) / FEE_DENOMINATOR;
                } else {
                    feeDetail.integratorTokenFee = (_inputAmount * fee.rateOrNativeFee) / FEE_DENOMINATOR;
                }
            }
        }

        return feeDetail;
    }


    function getAmountBeforeFee(
        address _token,
        uint256 _amountAfterFee,
        bytes calldata _feeData
    ) external view virtual returns (address feeToken, uint256 beforeAmount, uint256 nativeFeeAmount) {
        IButterRouterV3.Fee memory fee = _checkFeeData(_feeData);

        if (feeReceiver == address(0) && fee.referrer == address(0)) {
            return (address(0), _amountAfterFee, 0);
        }
        uint256 feeRate = 0;
        if (feeReceiver != address(0)) {
            nativeFeeAmount += routerFixedFee;
            feeRate += routerFeeRate;
        }
        if (fee.referrer != address(0)) {
            if (fee.feeType == IButterRouterV3.FeeType.FIXED) {
                nativeFeeAmount += fee.rateOrNativeFee;
            } else {
                feeRate += fee.rateOrNativeFee;
            }
        }

        if (_token == address(0) || _token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            beforeAmount = _amountAfterFee + nativeFeeAmount;
            if (feeRate > 0) {
                beforeAmount = (beforeAmount * FEE_DENOMINATOR) / (FEE_DENOMINATOR - feeRate) + 1;
            }
        } else {
            if (feeRate > 0) {
                beforeAmount = (_amountAfterFee * FEE_DENOMINATOR) / (FEE_DENOMINATOR - feeRate) + 1;
            } else {
                beforeAmount = _amountAfterFee;
            }
        }
    }

    function _checkFeeData(bytes calldata _feeData) internal view returns (IButterRouterV3.Fee memory fee) {
        if (_feeData.length == 0) {
            return fee;
        }
        fee = abi.decode(_feeData, (IButterRouterV3.Fee));
        if (fee.feeType == IButterRouterV3.FeeType.PROPORTION) {
            require(fee.rateOrNativeFee < maxFeeRate, "FeeManager: invalid feeRate");
        } else {
            require(fee.rateOrNativeFee < maxNativeFee, "FeeManager: invalid native fee");
        }
        return fee;
    }
}
