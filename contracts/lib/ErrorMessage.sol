// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;



library ErrorMessage {

    string internal constant ZERO_IN = "ButterRouterV2: zero in";

    string internal constant FEE_MISMATCH = "ButterRouterV2: fee mismatch";

    string internal constant FEE_LOWER = "ButterRouterV2: lower than fee";

    string internal constant ZERO_ADDR = "ButterRouterV2: zero addr";

    string internal constant NOT_CONTRACT = "ButterRouterV2: not contract";

    string internal constant BRIDGE_REQUIRE = "ButterRouterV2: bridge data required";

    string internal constant RECEIVE_LOW = "ButterRouterV2: receive too low";

    string internal constant SWAP_FAIL = "ButterRouterV2: swap failed";

    string internal constant SWAP_REQUIRE = "ButterRouterV2: swap data required";

    string internal constant CALL_AMOUNT_INVALID = "ButterRouterV2: callback amount invalid";

    string internal constant CALL_FAIL = "ButterRouterV2: callback failed";

    string internal constant MOS_ONLY = "ButterRouterV2: mos only";

    string internal constant DATA_EMPTY = "ButterRouterV2: data empty";

    string internal constant NO_APPROVE = "ButterRouterV2:not approved";

    string internal constant NATIVE_VAULE_OVERSPEND = "ButterRouterV2: native value overspend";

}