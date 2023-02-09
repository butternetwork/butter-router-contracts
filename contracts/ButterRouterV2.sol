// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;


import "./libs/TransferHelper.sol";
import "./interface/ButterCore.sol";
import "./interface/IERC20.sol";
import "./interface/MapMosV3.sol";


contract ButterRouterBsc {


    address  public admin;

    address  public mosAddress;

    address  public butterCore;

    event SwapAndBridge (address indexed from,address indexed originToken,uint256 indexed originAmount,uint256 formchainId,uint256 tochainId,address bridgeToken,uint256 bridgeAmount,bytes32 orderId,bytes targetToken,bytes to);



    modifier onlyOwner() {
        require(msg.sender == admin, "Caller is not an owner");
        _;
    }

    constructor(address _admin) {
        admin = _admin;
    }


    function entrance(ButterCore.AccessParams calldata swapData, bytes calldata mosData, uint256 amount, uint256 toChain, bytes memory to) external payable {


        require(amount > 0, "Sending value is zero");

        (, bytes memory targetToken, ) = abi.decode(mosData,((MapMosV3.SwapParam)[], bytes, address)); 

        bytes32 orderId;
        uint256 mosValue;
        if (swapData.inputOutAddre[0] == address(0)) {

            require(msg.value == amount, "Not enough money");
            // eth -- erc20
            uint256 msgValue;

            msgValue = IERC20(swapData.inputOutAddre[1]).balanceOf(address(this));
            ButterCore(butterCore).multiSwap{value : amount}(swapData);
            mosValue = IERC20(swapData.inputOutAddre[1]).balanceOf(address(this)) - msgValue;
            TransferHelper.safeApprove(swapData.inputOutAddre[1], mosAddress, mosValue);
            orderId = MapMosV3(mosAddress).swapOutToken(msg.sender, swapData.inputOutAddre[1], to, mosValue, toChain, mosData);
        } else {
            TransferHelper.safeTransferFrom(swapData.inputOutAddre[0], msg.sender, address(this), amount);
            (mosValue,orderId) = swapOutTokens(swapData, mosData, amount, toChain, to);
        }
        emit SwapAndBridge(msg.sender,swapData.inputOutAddre[0],amount,block.chainid,toChain,swapData.inputOutAddre[1],mosValue,orderId,targetToken,to);
    }


    function swapOutTokens(ButterCore.AccessParams memory _swapData, bytes memory _mosData, uint256 amount, uint256 _toChain, bytes memory _to) internal returns(uint256,bytes32){
        bytes32 orderId;
        uint256 msgValue;
        // uint256 currentValue;
        uint256 mosValue;
        // erc20 - eth
        if (_swapData.inputOutAddre[1] == address(0)) {
            msgValue = address(this).balance;
            TransferHelper.safeApprove(_swapData.inputOutAddre[0], butterCore, amount);
            ButterCore(butterCore).multiSwap(_swapData);
            mosValue = address(this).balance - msgValue;
            //  mosValue = currentValue - msgValue;
           orderId = MapMosV3(mosAddress).swapOutNative{value : mosValue}(msg.sender, _to, _toChain, _mosData);
        } else {
            // erc20-erc20
            msgValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this));
            TransferHelper.safeApprove(_swapData.inputOutAddre[0], mosAddress, amount);
            ButterCore(butterCore).multiSwap(_swapData);
            mosValue = IERC20(_swapData.inputOutAddre[1]).balanceOf(address(this)) - msgValue;
            //  mosValue = currentValue - msgValue;
            TransferHelper.safeApprove(_swapData.inputOutAddre[1], mosAddress, mosValue);
            orderId = MapMosV3(mosAddress).swapOutToken(msg.sender, _swapData.inputOutAddre[1], _to, mosValue, _toChain, _mosData);
        }

        return (mosValue,orderId);
    }


    function setMosAddress(address _mosAddress) public onlyOwner returns (bool){
        require(_mosAddress != address(0), 'Address cannot be zero');
        mosAddress = _mosAddress;
        return true;
    }

    function setButterCore(address _butterCore) public onlyOwner returns (bool){
        require(_butterCore != address(0), 'Address cannot be zero');
        butterCore = _butterCore;
        return true;
    }

    receive() external payable {
    }


}