// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRelayExecutor {
    function relayExecute(
        uint256 _fromChain,
        uint256 _toChain,
        bytes32 _orderId,
        address _token,
        uint256 _amount,
        address _caller,
        bytes calldata _fromAddress,
        bytes calldata _message,
        bytes calldata _retryMessage
    ) external payable returns (address token, uint256 amount, bytes memory target, bytes memory newMessage);
}
