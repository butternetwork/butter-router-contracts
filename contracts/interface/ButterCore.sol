// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "../libs/ButterLib.sol";
interface ButterCore {
    function multiSwap(ButterLib.ButterCoreSwapParam calldata params) external payable returns(uint256);
}


