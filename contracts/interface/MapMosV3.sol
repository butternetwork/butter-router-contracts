// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface MapMosV3 {

    function swapOutToken(
        address _initiatorAddress,
        address _token, // src token
        bytes memory _to,
        uint256 _amount,
        uint256 _toChain, // target chain id
        bytes calldata swapData
    ) external returns(bytes32 orderId);


    function swapOutNative(
        address _initiatorAddress,
        bytes memory _to,
        uint256 _toChain, // target chain id
        bytes calldata swapData
    ) external payable returns(bytes32 orderId);


}