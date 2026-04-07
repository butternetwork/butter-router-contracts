// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interface/IGateway.sol";

/// @dev Minimal IGateway mock for unit testing ButterRouterV4
contract GatewayMock is IGateway {
    bytes32 public lastOrderId;

    function deposit(
        address token,
        uint256 amount,
        address to,
        address refund,
        uint256 deadline
    ) external payable override returns (bytes32 orderId) {
        orderId = keccak256(abi.encodePacked(token, amount, to, refund, deadline, block.timestamp));
        lastOrderId = orderId;
    }

    function bridgeOut(
        address token,
        uint256 amount,
        uint256 toChain,
        bytes memory to,
        address refundAddr,
        bytes memory payload,
        uint256 deadline
    ) external payable override returns (bytes32 orderId) {
        orderId = keccak256(abi.encodePacked(token, amount, toChain, to, refundAddr, payload, deadline));
        lastOrderId = orderId;
    }
}
