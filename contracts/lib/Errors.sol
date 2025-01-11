// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library Errors {
    error NOT_CONTRACT();
    error SWAP_FAIL();
    error CALL_BACK_FAIL();
    error ZERO_IN();
    error FEE_MISMATCH();
    error FEE_LOWER();
    error ZERO_ADDRESS();
    error RECEIVE_LOW();
    error CALL_AMOUNT_INVALID();
    error BRIDGE_ONLY();
    error DATA_EMPTY();
    error NO_APPROVE();
    error NATIVE_VALUE_OVERSPEND();
    error EMPTY();
    error UNSUPPORT_DEX_TYPE();
    error SWAP_SAME_TOKEN();
    error CANNOT_ADJUST();
    error SELF_ONLY();
    error CALL_FUNC_BLACK_LIST();
}
