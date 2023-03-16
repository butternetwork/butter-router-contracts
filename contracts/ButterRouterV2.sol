// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.9;
// pragma experimental ABIEncoderV2;


// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/access/Ownable2Step.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "./interface/ButterCore.sol";
// import "./interface/MapMosV3.sol";


// contract ButterRouterBscV2  is Ownable2Step{
//     using SafeERC20 for IERC20;

//     address  public mosAddress;

//     address  public butterCore;

//     event SwapAndBridge (address indexed from,address indexed originToken,uint256 indexed originAmount,uint256 formchainId,uint256 tochainId,address bridgeToken,uint256 bridgeAmount,bytes32 orderId,bytes targetToken,bytes to);


//     constructor() {}


//     function entrance(ButterCore.AccessParams calldata swapData, bytes calldata mosData, uint256 amount, uint256 toChain, bytes memory to) external payable {


//         require(amount > 0, "Sending value is zero");

//         (, bytes memory targetToken, ) = abi.decode(mosData,((MapMosV3.SwapParam)[], bytes, address)); 

//         bytes32 orderId;
//         uint256 mosValue;
//         if(swapData.amountInArr.length == 0) {
//             mosValue = amount;
//             if(swapData.inputOutAddre[1] == address(0)) {
//                orderId = MapMosV3(mosAddress).swapOutNative{value : mosValue}(msg.sender, to, toChain, mosData);
//             } else {
//                IERC20(swapData.inputOutAddre[1]).safeApprove(mosAddress, mosValue);
//                orderId = MapMosV3(mosAddress).swapOutToken(msg.sender, swapData.inputOutAddre[1], to, mosValue, toChain, mosData);
//             }
//          // erc20 - eth  
//          }else if (swapData.inputOutAddre[0] == address(0)) {

//             require(msg.value == amount, "Not enough money");
//             // eth -- erc20
//             uint256 msgValue;

//             msgValue = IERC20(swapData.inputOutAddre[1]).balanceOf(address(this));
//             ButterCore(butterCore).multiSwap{value : amount}(swapData);
//             mosValue = IERC20(swapData.inputOutAddre[1]).balanceOf(address(this)) - msgValue;
//             IERC20(swapData.inputOutAddre[1]).safeApprove(mosAddress, mosValue);
//             orderId = MapMosV3(mosAddress).swapOutToken(msg.sender, swapData.inputOutAddre[1], to, mosValue, toChain, mosData);
//         } else {
//             IERC20(swapData.inputOutAddre[0]).safeTransferFrom(msg.sender, address(this), amount);
//             (mosValue,orderId) = swapOutTokens(swapData, mosData, amount, toChain, to);
//         }
//         emit SwapAndBridge(msg.sender,swapData.inputOutAddre[0],amount,block.chainid,toChain,swapData.inputOutAddre[1],mosValue,orderId,targetToken,to);
//     }


//     function swapOutTokens(ButterCore.AccessParams memory _swapData, bytes memory _mosData, uint256 amount, uint256 _toChain, bytes memory _to) internal returns(uint256,bytes32){
//         bytes32 orderId;
//         uint256 msgValue;
//         // uint256 currentValue;
//         uint256 mosValue;
//         // erc20 - eth
//         if (_swapData.inputOutAddre[1] == address(0)) {
//             msgValue = address(this).balance;
//             IERC20(_swapData.inputOutAddre[0]).safeApprove(butterCore, amount);
//             ButterCore(butterCore).multiSwap(_swapData);
//             mosValue = address(this).balance - msgValue;
//             //  mosValue = currentValue - msgValue;
//            orderId = MapMosV3(mosAddress).swapOutNative{value : mosValue}(msg.sender, _to, _toChain, _mosData);
//         } else {
//             // erc20-erc20
//             msgValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this));
//             IERC20(_swapData.inputOutAddre[0]).safeApprove(butterCore, amount);
//             ButterCore(butterCore).multiSwap(_swapData);
//             mosValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this)) - msgValue;
//             //  mosValue = currentValue - msgValue;
//             IERC20(_swapData.inputOutAddre[1]).safeApprove(mosAddress, mosValue);
//             orderId = MapMosV3(mosAddress).swapOutToken(msg.sender, _swapData.inputOutAddre[1], _to, mosValue, _toChain, _mosData);
//         }

//         return (mosValue,orderId);
//     }

//     function setMosAddress(address _mosAddress) public onlyOwner returns (bool){
//         require(_mosAddress.code.length > 0, '_mosAddress must be contract');
//         mosAddress = _mosAddress;
//         return true;
//     }

//     function setButterCore(address _butterCore) public onlyOwner returns (bool){
//         require(_butterCore.code.length > 0, '_butterCore must be contract');
//         butterCore = _butterCore;
//         return true;
//     }

//     receive() external payable {}


// }