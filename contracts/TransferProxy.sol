// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "./lib/Helper.sol";

// Be careful this contract contains unsafe call !.
// Do not approve token or just approve the right amount before call it.
// Clear approve in the same transaction if calling failed.
contract TransferProxy {
        
    function transfer(address _token,uint256 _amount,address _receiver) external payable {
        require(_amount > 0,"amount in must gt 0");
        if(Helper._isNative(_token)) {
            require(msg.value == _amount,"amount matching");
        } else {
             SafeERC20.safeTransferFrom(
                IERC20(_token),
                msg.sender,
                address(this),
                _amount
            );
        }
        Helper._transfer(_token,_receiver,_amount);
    }
}