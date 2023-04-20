// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;



library ErrorMessage {

    string internal constant ZERO_IN = "ButterRouterV2:zero in";

    string internal constant COST_MISMATCH = "ButterRouterV2:cost mismatch";

    string internal constant ZERO_ADDR = "ButterRouterV2:zero addr";

    string internal constant NO_CONTRACT = "ButterRouterV2:no contract";

    string internal constant BRIDGE_REQUIRE = "ButterRouterV2:bridge data required";

    string internal constant RECEIVE_LOW = "ButterRouterV2:receive too low";

    string internal constant SWAP_FAIL = "ButterRouterV2:swap failed";

    string internal constant SWAP_REQUIRE = "ButterRouterV2:swap data required";

    string internal constant CALL_AMOUNT_INVALID = "ButterRouterV2:callback amount invalid";

    string internal constant CALL_FAIL = "ButterRouterV2:callback failed";

    string internal constant MOS_ONLY = "ButterRouterV2:mos only";

    string internal constant DATA_EMPTY = "ButterRouterV2:data empty";

    string internal constant COST_LITTLE = "ButterRouterV2:cost little";

    string internal constant NO_APPROVE = "ButterRouterV2:not approved";

}