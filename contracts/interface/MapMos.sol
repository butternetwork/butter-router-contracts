
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface MapMos {


  // struct SwapData {
  //       uint256[]  amountInArr;  
  //       bytes[]    paramsArr;
  //       uint32[]  routerIndex; 
  //       address[2]  input_Out_Addre; 
  //        // 0 -input  1- Out                     
  //   } 


struct SwapParam {
    uint256 amountIn;
    uint256 minAmountOut;
    bytes path; // 0xtokenin+0xtokenOut on evm, or tokenIn'X'tokenOut on near
    uint64 routerIndex; // pool id on near or router index on evm
}

struct SwapData {
    SwapParam[] swapParams;
    bytes targetToken;
    bytes toAddress;
}
  


  function swapOutToken(
        address _token, // src token
        uint256 _amount,
        address _mapTargetToken, // targetToken on map
        uint256 _toChain, // target chain id
        SwapData calldata swapData
    )external;



    function swapOutNative(
        address _mapTargetToken, // targetToken on map
        uint256 _toChain, // target chain id
        SwapData calldata swapData
    )
    external
    payable;
   
  

  }