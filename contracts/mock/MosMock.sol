// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@butternetwork/bridge/contracts/interface/IButterBridgeV3.sol";
import "../interface/IButterRouterV2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BridgeMock is IButterBridgeV3 {


    function swapOutToken(
        address _initiatorAddress,
        address _token, // src token
        bytes memory _to,
        uint256 _amount,
        uint256 _toChain, // target chain id
        bytes calldata swapData
    ) external payable override returns (bytes32 orderId) {
        emit SwapOut(
            bytes32(0),
            _toChain,
            _token,
            _amount,
            _initiatorAddress,
            msg.sender,
            _to,
            abi.encodePacked(_token),
            _amount,
            _amount
        );
        return bytes32(0);
    }

    function mockRemoteSwapAndCall(
        address _router,
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData
    ) external payable {
        if (_srcToken == address(0)) {
            require(msg.value == _amount);
        } else {
            SafeERC20.safeTransferFrom(IERC20(_srcToken), msg.sender, _router, _amount);
        }

        IButterRouterV2(_router).onReceived{value: msg.value}(
            bytes32(0),
            _srcToken,
            _amount,
            0x01,
            bytes(""),
            _swapData
        );
    }

    function depositToken(address _token, address to, uint256 _amount) external payable override {}

    function getNativeFee(
        address _token,
        uint256 _gasLimit,
        uint256 _toChain
    ) external view override returns (uint256) {}
}
