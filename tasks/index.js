let { task } = require("hardhat/config");
require("./subs/IntegratorManager.js");
require("./subs/flatten.js");
task("routerV3", "deploy butter router V3 contract and set", require("./subs/routerV3.js"));
task("routerV31", "deploy butter router V31 contract and set", require("./subs/routerV31.js"));
task("routerV4", "deploy butter router V4 contract and set", require("./subs/routerV4.js"));
task("receiver", "deploy receiver contract and set", require("./subs/receiver.js"));
task("receiverV2", "deploy receiver V2 contract and set", require("./subs/receiverV2.js"));
task("deploySwapAdapter", "deploy swapAdapter contract", require("./subs/swapAdapter.js"));
task("deploySwapAggregator", "deploy SwapAggregator contract", require("./subs/swapAggregator.js"));
task("deployFeeReceiver", "deploy feeReceiver", require("./subs/deployFeeReceiver.js"))
    .addParam("payees", "payees address array")
    .addParam("shares", "shares array");

task("deployOmniAdapter", "deploy OmniAdapter", require("./subs/OmniAdapter.js"));
task("solanaReceiver", "deploy solana receiver contract and set", require("./subs/solanaReveiver.js"));
require("./subs/AffiliateFeeManager.js");
require("./subs/RelayExecutor.js");
require("./subs/verify.js");
