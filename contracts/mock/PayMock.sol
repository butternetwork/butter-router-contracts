// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

contract PayMock {
    event Pay(uint256 amount);

    function payFor(address) external payable {
        emit Pay(msg.value);
    }
}
