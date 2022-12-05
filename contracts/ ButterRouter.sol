
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;


import "./libs/TransferHelper.sol";
import "./interface/ButterCore.sol";
import "./interface/IERC20.sol";
import "./interface/MapMos.sol";
import "hardhat/console.sol";

contract ButterRouterV1{


        struct ExchangeData {
            uint256[]  amountInArr;  
            bytes[]    paramsArr;
            uint32[]  routerIndex; 
            address[2]  inputOutAddre;
            uint256     amount;     
        } 


       MapMos.SwapData  _swapData;

       address constant MOSADDRESS = 0x35e7F50392Adf4B6eEb822D9102AD8A992A9B520;

       address constant BUTTERCORE = 0xb401355440842aAb5A4DeA8ABFC7439d9Cb8ab55;



    function  entrance(ExchangeData calldata exchangeData) external  payable{
        
        require(exchangeData.amount > 0, "Sending value is zero");
        
        {
        if(exchangeData.inputOutAddre[0] == address(0)){

            require(msg.value ==exchangeData.amount,"Not enough money");
            
                swapOutTokens(exchangeData);

                }else{
                console.log(exchangeData.inputOutAddre[0],msg.sender,address(this),exchangeData.amount);
                TransferHelper.safeTransferFrom(exchangeData.inputOutAddre[0],msg.sender,address(this),exchangeData.amount);
                swapOutTokens(exchangeData);
                } 
            }
        }


      
        
        function swapOutTokens(ExchangeData memory exchangeData) internal{
            
            uint256[] memory _amountInArr = exchangeData.amountInArr;
            bytes[] memory _ParamsArr = exchangeData.paramsArr;
            uint32[] memory _routerIndex = exchangeData.routerIndex;
            address[2] memory _inputOutAddre = exchangeData.inputOutAddre;


            // uint256 msgValue;
            // uint256 currentValue;
            // uint256 mosValue;

            // erc20 - eth
            if(_inputOutAddre[1] == address(0)){
                //  msgValue = address(this).balance;
                 TransferHelper.safeApprove(_inputOutAddre[0],BUTTERCORE,exchangeData.amount);
                 ButterCore(BUTTERCORE).multiSwap(ButterCore.AccessParams(_amountInArr,_ParamsArr,_routerIndex,_inputOutAddre));
                //  mosValue = address(this).balance - msgValue ;
                // //  mosValue = currentValue - msgValue;
                // MapMos(MOSADDRESS).swapOutNative{value:mosValue}(_mapTargetToken,_toChain,_swapData);
            // eth -- erc20 
            }else if(_inputOutAddre[0] == address(0)){

                //  msgValue = IERC20(_inputOutAddre[1]).balanceOf(address(this));
                 ButterCore(BUTTERCORE).multiSwap{value:exchangeData.amount}(ButterCore.AccessParams(_amountInArr,_ParamsArr,_routerIndex,_inputOutAddre));
                //  mosValue = IERC20(_input_Out_Addre[1]).balanceOf(address(this)) - msgValue;
                // //  mosValue = currentValue - msgValue;
                //  TransferHelper.safeApprove(_input_Out_Addre[1], MOSADDRESS, mosValue);
                //  MapMos(MOSADDRESS).swapOutToken(_token, _amount, _mapTargetToken,_toChain,_swapData);

             }else{
                 // erc20-erc20
                //  msgValue = IERC20(_inputOutAddre[1]).balanceOf(address(this));
                 TransferHelper.safeApprove(_inputOutAddre[0],BUTTERCORE, exchangeData.amount);
                 console.log(_inputOutAddre[0], BUTTERCORE, exchangeData.amount);
             
                 ButterCore(BUTTERCORE).multiSwap(ButterCore.AccessParams(_amountInArr,_ParamsArr,_routerIndex,_inputOutAddre));
                //  mosValue = IERC20(_input_Out_Addre[1]).balanceOf(address(this)) - msgValue;
                // //  mosValue = currentValue - msgValue;
                //  TransferHelper.safeApprove(_input_Out_Addre[1], MOSADDRESS, mosValue);
                //  MapMos(MOSADDRESS).swapOutToken(_token, _amount, _mapTargetToken, _toChain, _swapData);
             }
        }


        receive() external payable { 
    }

}