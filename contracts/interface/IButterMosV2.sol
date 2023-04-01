// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface IButterMosV2 {

    function swapOutToken(
        address _sender,
        address _token, // src token
        bytes memory _to,
        uint256 _amount,
        uint256 _toChain, // target chain id
        bytes calldata data
    ) external returns(bytes32 orderId);


    function swapOutNative(
        address _sender,
        bytes memory _to,
        uint256 _toChain, // target chain id
        bytes calldata data
    ) external payable returns(bytes32 orderId);

}