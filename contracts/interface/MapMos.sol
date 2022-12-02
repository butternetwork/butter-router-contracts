
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface MapMos {


  struct SwapData {
        uint256[]  amountInArr;  
        bytes[]    paramsArr;
        uint32[]  routerIndex; 
        address[2]  input_Out_Addre; 
         // 0 -input  1- Out                     
    } 

    

  function swapOutToken(
        address _token, // src token
        uint256 _amount,
        address _mapTargetToken, // targetToken on map
        uint256 _toChain, // target chain id
        bytes memory _toAddress, // final target chain receiving address
        SwapData calldata swapData
    )external;



    function swapOutNative(
        address _mapTargetToken, // targetToken on map
        uint256 _toChain, // target chain id
        bytes memory _toAddress, // final target chain receiving address
        SwapData calldata swapData
    )
    external
    payable;
   
  

  }