
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;


import "./libs/TransferHelper.sol";
import "./interface/BarterswapRouter.sol";
import "./interface/IERC20.sol";
import "./interface/MapMos.sol";


contract ButterRouterV1{


        struct ExchangeData {
            uint256[]  amountInArr;  
            bytes[]    paramsArr;
            uint32[]  routerIndex; 
            address[2]  input_Out_Addre;
        } 


        function  entrance(bytes calldata bridgeParams) external payable{

        address _token; // src token
        uint256 _amount;
        address _mapTargetToken; // targetToken on map
        uint256 _toChain; // target chain id
        bytes memory _toAddress; // final target chain receiving address
        ExchangeData memory _exchangeData;
        address _butterCore;
        address _mosAddress;

        (_token,_amount,_mapTargetToken,_toChain,_toAddress,_exchangeData,_butterCore,_mosAddress) = abi.decode(bridgeParams,
                    (address,uint256,address,uint256,bytes,ExchangeData,address,address));
        
         if(_token == address(0)){
            require(msg.value == _amount,"Not enough money");

            swapOutTokens(_token,_amount,_mapTargetToken,_toChain,_toAddress,_exchangeData,_butterCore,_mosAddress);

            }else{
                TransferHelper.safeTransferFrom(_token,msg.sender,address(this),_amount);
                swapOutTokens(_token,_amount,_mapTargetToken,_toChain,_toAddress,_exchangeData,_butterCore,_mosAddress);
            } 

        }


        function swapOutTokens(address _token,uint256 _amount,address _mapTargetToken,uint256 _toChain,bytes memory _toAddress,ExchangeData memory _exchangeData,address _butterCore,address _mosAddress) internal{
            
            uint256[] memory _amountInArr = _exchangeData.amountInArr;
            bytes[]  memory  _paramsArr = _exchangeData.paramsArr;
            uint32[] memory _routerIndex = _exchangeData.routerIndex;
            address[2] memory _input_Out_Addre = _exchangeData.input_Out_Addre;
            
            uint256 msgValue;
            // uint256 currentValue;
            uint256 mosValue;

            // erc20 - eth
            if(_input_Out_Addre[1] == address(0)){
                 msgValue = msg.sender.balance;
                 TransferHelper.safeApprove(_input_Out_Addre[0], _butterCore, _amount);
                 ButterCore(_butterCore).multiSwap(ButterCore.AccessParams(_amountInArr,_paramsArr,_routerIndex,_input_Out_Addre));
                 mosValue = msg.sender.balance - msgValue ;
                //  mosValue = currentValue - msgValue;
                MapMos(_mosAddress).swapOutNative{value:mosValue}(_mapTargetToken,_toChain,_toAddress,MapMos.SwapData(_amountInArr,_paramsArr,_routerIndex,_input_Out_Addre));
            // eth -- erc20 
            }else if(_input_Out_Addre[0] == address(0)){

                 msgValue = IERC20(_input_Out_Addre[1]).balanceOf(msg.sender);
                 ButterCore(_butterCore).multiSwap{value:_amount}(ButterCore.AccessParams(_amountInArr,_paramsArr,_routerIndex,_input_Out_Addre));
                 mosValue = IERC20(_input_Out_Addre[1]).balanceOf(msg.sender) - msgValue;
                //  mosValue = currentValue - msgValue;
                 TransferHelper.safeApprove(_input_Out_Addre[1], _mosAddress, mosValue);
                 MapMos(_mosAddress).swapOutToken(_token, _amount, _mapTargetToken, _toChain, _toAddress, MapMos.SwapData(_amountInArr,_paramsArr,_routerIndex,_input_Out_Addre));

             }else{
                 // erc20-erc20
                 msgValue = IERC20(_input_Out_Addre[1]).balanceOf(msg.sender);
                 TransferHelper.safeApprove(_input_Out_Addre[0], _butterCore, _amount);
                 ButterCore(_butterCore).multiSwap(ButterCore.AccessParams(_amountInArr,_paramsArr,_routerIndex,_input_Out_Addre));
                 mosValue = IERC20(_input_Out_Addre[1]).balanceOf(msg.sender) - msgValue;
                //  mosValue = currentValue - msgValue;
                 TransferHelper.safeApprove(_input_Out_Addre[1], _mosAddress, mosValue);
                 MapMos(_mosAddress).swapOutToken(_token, _amount, _mapTargetToken, _toChain, _toAddress, MapMos.SwapData(_amountInArr,_paramsArr,_routerIndex,_input_Out_Addre));

             }
           
        }
        
        receive() external payable { 
    }

}