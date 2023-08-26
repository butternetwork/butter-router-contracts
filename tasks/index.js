let { task } = require("hardhat/config");

task("routerV1",
    "deploy butter router contract and set",
    require("./subs/routerV1.js"))
    .addParam("mos", "mos address")
    .addParam("core", "butter core address")

task("routerV2",
    "deploy butter router V2 contract and set",
    require("./subs/routerV2.js"))

task("routerPlus",
    "deploy butter router V2 contract and set",
    require("./subs/routerPlus.js"))

task("deployFeeReceiver",
    "deploy feeReceiver",
     require("./subs/deployFeeReceiver.js"))
    .addParam("payees", "payees address array")
    .addParam("shares", "shares array")


task("deployAggregationAdaptor",
    "deploy aggregation adaptor",
    require("./subs/deployAggregationAdaptor.js"))
    
   
task("receiver",
    "deploy Receiver",
     require("./subs/receiver.js"))
    .addParam("router", "router address")
    
