// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


import "../interface/MapMosV3.sol";

contract MosMock is MapMosV3 {

    function swapOutToken(
        address ,
        address , 
        bytes memory ,
        uint256 ,
        uint256 , 
        bytes calldata 
    ) external override returns(bytes32 orderId){
         return bytes32(0);
    }


    function swapOutNative(
        address ,
        bytes memory ,
        uint256 , // target chain id
        bytes calldata 
    ) external payable override returns(bytes32 orderId){
           return bytes32(0);
    }
}