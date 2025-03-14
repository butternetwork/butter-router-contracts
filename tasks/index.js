let { task } = require("hardhat/config");
require("./subs/IntegratorManager.js");
task("routerV2", "deploy butter router V2 contract and set", require("./subs/routerV2.js"));
task("routerV3", "deploy butter router V3 contract and set", require("./subs/routerV3.js"));
task("receiver", "deploy receiver contract and set", require("./subs/receiver.js"));
task("deploySwapAdapter", "deploy swapAdapter contract", require("./subs/swapAdapter.js"));
task("deployFeeReceiver", "deploy feeReceiver", require("./subs/deployFeeReceiver.js"))
    .addParam("payees", "payees address array")
    .addParam("shares", "shares array");

task("deployOmniAdapter", "deploy OmniAdapter", require("./subs/OmniAdapter.js"));
task("solanaReceiver", "deploy solana receiver contract and set", require("./subs/solanaReveiver.js"));
require("./subs/AffiliateFeeManager.js");
require("./subs/RelayExecytor.js");
