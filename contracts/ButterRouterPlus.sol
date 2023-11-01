// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@butternetwork/bridge/contracts/interface/IButterMosV2.sol";
import "./interface/IButterRouterV2.sol";
import "./lib/ErrorMessage.sol";
import "./abstract/Router.sol";
import "./lib/Helper.sol";

contract ButterRouterPlus is Router, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    constructor(address _owner, address _wToken) payable Router(_owner, _wToken) {}

    function swapAndCall(
        bytes32 _transferId,
        address _srcToken,
        uint256 _amount,
        FeeType _feeType,
        bytes calldata _swapData,
        bytes calldata _callbackData,
        bytes calldata _permitData
    ) external payable nonReentrant transferIn(_srcToken, _amount, _permitData) {
        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.transferId = _transferId;
        swapTemp.feeType = _feeType;
        require(_swapData.length + _callbackData.length > 0, ErrorMessage.DATA_EMPTY);
        (, swapTemp.swapAmount) = _collectFee(
            swapTemp.srcToken,
            swapTemp.srcAmount,
            swapTemp.transferId,
            swapTemp.feeType
        );

        (
            swapTemp.receiver,
            swapTemp.target,
            swapTemp.swapToken,
            swapTemp.swapAmount,
            swapTemp.callAmount
        ) = _doSwapAndCall(_swapData, _callbackData, swapTemp.srcToken, swapTemp.swapAmount);

        if (swapTemp.swapAmount > swapTemp.callAmount) {
            Helper._transfer(swapTemp.swapToken, swapTemp.receiver, (swapTemp.swapAmount - swapTemp.callAmount));
        }

        emit SwapAndCall(
            msg.sender,
            swapTemp.receiver,
            swapTemp.target,
            swapTemp.transferId,
            swapTemp.srcToken,
            swapTemp.swapToken,
            swapTemp.srcAmount,
            swapTemp.swapAmount,
            swapTemp.callAmount
        );
    }

    receive() external payable {}
}
