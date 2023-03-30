// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "../interface/MapMosV3.sol";

contract MosMock is MapMosV3 {
    event SwapOut(
        uint256 indexed fromChain, // from chain
        uint256 indexed toChain, // to chain
        bytes32 orderId, // order id
        bytes token, // token to transfer
        bytes from, // source chain from address
        bytes to,
        uint256 amount,
        bytes swapData // swap data, used on target chain dex.
    );

    function swapOutToken(
        address _initiatorAddress,
        address _token, // src token
        bytes memory _to,
        uint256 _amount,
        uint256 _toChain, // target chain id
        bytes calldata swapData
    ) external returns (bytes32 orderId) {
        emit SwapOut(
            block.chainid,
            _toChain,
            bytes32(0),
            abi.encodePacked(_token),
            abi.encodePacked(_initiatorAddress),
            _to,
            _amount,
            swapData
        );
        return bytes32(0);
    }

    function swapOutNative(
        address _initiatorAddress,
        bytes memory _to,
        uint256 _toChain, // target chain id
        bytes calldata swapData
    ) external payable returns (bytes32 orderId) {
        emit SwapOut(
            block.chainid,
            _toChain,
            bytes32(0),
            abi.encodePacked(address(0)),
            abi.encodePacked(_initiatorAddress),
            _to,
            msg.value,
            swapData
        );
        return bytes32(0);
    }
}
