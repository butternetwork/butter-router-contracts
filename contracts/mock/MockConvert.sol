// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockConvert {
    address token1;
    address token2;
    constructor(address _token1,address _token2){
        token1 = _token1;
        token2 = _token2;
    }

    function convert(address _fromToken,address,uint256 _amount) external payable {
        if(_fromToken == token1){
          SafeERC20.safeTransferFrom(IERC20(token1),msg.sender,address(this),_amount);
          SafeERC20.safeTransfer(IERC20(token2),msg.sender,_amount);
        } else if(_fromToken == token2) {
          SafeERC20.safeTransferFrom(IERC20(token2),msg.sender,address(this),_amount);
          SafeERC20.safeTransfer(IERC20(token1),msg.sender,_amount);
        } else{

        }
    }
}
