// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;


import "./libs/TransferHelper.sol";
import "./interface/ButterCore.sol";
import "./interface/IERC20.sol";
import "./interface/MapMos.sol";
import "hardhat/console.sol";



contract ButterRouterV2{


       address constant MOSADDRESS = 0xFe103B6Fc8Ee2e042a0BEC78f0a072074F7734f4;

       address constant BUTTERCORE = 0xb401355440842aAb5A4DeA8ABFC7439d9Cb8ab55;



         // targetToken on map
        // target chain id
    function  entrance(ButterCore.AccessParams calldata swapData,MapMos.SwapData calldata mosData,uint256 amount,address mapTargetToken, uint256 toChain) external  payable{
        

        require(amount > 0, "Sending value is zero");


        if(swapData.inputOutAddre[0] == address(0)){
            
            require(msg.value == amount,"Not enough money");

            swapOutTokens(swapData,mosData,amount,mapTargetToken,toChain);
              }else{
            console.log(swapData.inputOutAddre[0],msg.sender,address(this),amount);
            TransferHelper.safeTransferFrom(swapData.inputOutAddre[0],msg.sender,address(this),amount);
            swapOutTokens(swapData,mosData,amount,mapTargetToken,toChain);
            } 

        }


        function swapOutTokens(ButterCore.AccessParams memory _swapData,MapMos.SwapData memory _mosData,uint256 amount,address _mapTargetToken, uint256 _toChain) internal{

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
                MapMos(MOSADDRESS).swapOutNative{value:mosValue}(_mapTargetToken,_toChain,_mosData);

            // eth -- erc20 
            }else if(_swapData.inputOutAddre[0] == address(0)){

                 msgValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this));
                 ButterCore(BUTTERCORE).multiSwap{value:amount}(_swapData);
                 mosValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this)) - msgValue;
                //  mosValue = currentValue - msgValue;

                 TransferHelper.safeApprove(_swapData.inputOutAddre[1], MOSADDRESS, mosValue);
                 console.log(_swapData.inputOutAddre[1], MOSADDRESS, mosValue);
                 MapMos(MOSADDRESS).swapOutToken(_swapData.inputOutAddre[1], mosValue, _mapTargetToken,_toChain,_mosData);

             }else{
                 // erc20-erc20
                 msgValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this));
                 TransferHelper.safeApprove(_swapData.inputOutAddre[0], BUTTERCORE, amount);
                 ButterCore(BUTTERCORE).multiSwap(_swapData);
                 mosValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this)) - msgValue;
                //  mosValue = currentValue - msgValue;
                 TransferHelper.safeApprove(_swapData.inputOutAddre[1], MOSADDRESS, mosValue);
                 MapMos(MOSADDRESS).swapOutToken(_swapData.inputOutAddre[1], mosValue, _mapTargetToken, _toChain, _mosData);
             }
        }

        receive() external payable { 
    }


}