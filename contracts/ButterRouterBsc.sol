
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;


import "./libs/TransferHelper.sol";
import "./interface/ButterCore.sol";
import "./interface/IERC20.sol";
import "./interface/MapMosV3.sol";
import "hardhat/console.sol";



contract ButterRouterBsc{

     

       address constant  MOSADDRESS = 0xA179d181cF855258Bc26a8623E1CE7a2e3fD3606;

       address constant BUTTERCORE = 0x448484ab100D9F374621eE1A520419CF21349F11;

    // address constant  MOSADDRESS = 0x8A6aaDf40fB100f4a27c9ADA1B0F0d90eC91F35C;

    // address constant BUTTERCORE = 0xA8d5352e8629B2FFE3d127142FB1D530f8b793eC;


    function  entrance(ButterCore.AccessParams calldata swapData,bytes calldata mosData,uint256 amount,uint256 toChain,bytes memory to) external  payable{
        

        require(amount > 0, "Sending value is zero");


        if(swapData.inputOutAddre[0] == address(0)){
            
               require(msg.value == amount,"Not enough money");

               swapOutTokens(swapData,mosData,amount,toChain,to);
           }else{
               TransferHelper.safeTransferFrom(swapData.inputOutAddre[0],msg.sender,address(this),amount);
               swapOutTokens(swapData,mosData,amount,toChain,to);
            } 

        }


        function swapOutTokens(ButterCore.AccessParams memory _swapData,bytes memory _mosData,uint256 amount,uint256 _toChain,bytes memory _to) internal{
            uint256 msgValue;
            // uint256 currentValue;
            uint256 mosValue;
            // erc20 - eth
            if(_swapData.inputOutAddre[1] == address(0)){
                 msgValue = address(this).balance;
                 TransferHelper.safeApprove(_swapData.inputOutAddre[0],BUTTERCORE,amount);
                 ButterCore(BUTTERCORE).multiSwap(_swapData);
                 mosValue = address(this).balance - msgValue ;
                //  mosValue = currentValue - msgValue;
                MapMosV3(MOSADDRESS).swapOutNative{value:mosValue}(_to,_toChain,_mosData);

            // eth -- erc20 
            }else if(_swapData.inputOutAddre[0] == address(0)){

                 msgValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this));
                 ButterCore(BUTTERCORE).multiSwap{value:amount}(_swapData);
                 mosValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this)) - msgValue;
                //  mosValue = currentValue - msgValue;
                 TransferHelper.safeApprove(_swapData.inputOutAddre[1], MOSADDRESS, mosValue);
                 console.log(_swapData.inputOutAddre[1], MOSADDRESS, mosValue);
                 MapMosV3(MOSADDRESS).swapOutToken(_swapData.inputOutAddre[1],_to, mosValue,_toChain,_mosData);

             }else{
                 // erc20-erc20
                 msgValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this));
                 TransferHelper.safeApprove(_swapData.inputOutAddre[0],BUTTERCORE,amount);
                 ButterCore(BUTTERCORE).multiSwap(_swapData);
                 mosValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this)) - msgValue;
                //  mosValue = currentValue - msgValue;
                 TransferHelper.safeApprove(_swapData.inputOutAddre[1], MOSADDRESS,mosValue);
                 MapMosV3(MOSADDRESS).swapOutToken(_swapData.inputOutAddre[1],_to,mosValue,_toChain,_mosData);
             }
        }

        receive() external payable { 
    }


}