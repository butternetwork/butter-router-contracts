// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";


contract FeeReceiver is Ownable2Step,PaymentSplitter {

    constructor(address[] memory payees, uint256[] memory shares_,address _owner) PaymentSplitter(payees,shares_) payable{
        require(_owner != address(0), "owner cannot be zero address");
        _transferOwnership(_owner);
    }
    
}