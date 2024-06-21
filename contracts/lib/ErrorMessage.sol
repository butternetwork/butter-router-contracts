// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

library ErrorMessage {
    string internal constant ZERO_IN = "ButterRouter: zero in";

    string internal constant FEE_MISMATCH = "ButterRouter: fee mismatch";

    string internal constant FEE_LOWER = "ButterRouter: lower than fee";

    string internal constant ZERO_ADDR = "ButterRouter: zero addr";

    string internal constant NOT_CONTRACT = "ButterRouter: not contract";

    string internal constant BRIDGE_REQUIRE = "ButterRouter: bridge data required";

    string internal constant RECEIVE_LOW = "ButterRouter: receive too low";

    string internal constant SWAP_FAIL = "ButterRouter: swap failed";

    string internal constant SWAP_REQUIRE = "ButterRouter: swap data required";

    string internal constant CALL_AMOUNT_INVALID = "ButterRouter: callback amount invalid";

    string internal constant CALL_FAIL = "ButterRouter: callback failed";

    string internal constant MOS_ONLY = "ButterRouter: mos only";

    string internal constant DATA_EMPTY = "ButterRouter: data empty";

    string internal constant NO_APPROVE = "ButterRouter: not approved";

    string internal constant NATIVE_VALUE_OVERSPEND = "ButterRouter: native value overspend";
}
