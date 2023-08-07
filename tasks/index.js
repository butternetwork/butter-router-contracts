let { task } = require("hardhat/config");


task("deployRouterV1",
    "deploy butter router contract",
    require("./subs/deployRouterV1.js"))
    .addParam("mos", "mos address")
    .addParam("core", "butter core address")

task("setMos",
    "set mos address",
    require("./subs/setMos.js"))
    .addParam("router", "router address")
    .addParam("mos", "mos address")

task("setCore",
    "set mos address",
    require("./subs/setCore.js")
)
    .addParam("router", "router address")
    .addParam("core", "core address")

//<---------------------------------------------------------v2----------------------------------------------------------->
task("deployRouterV2",
    "deploy butter router V2 contract",
    require("./subs/deployRouterv2.js"))
    .addParam("mos", "mos address")
    .addParam("wtoken", "wtoken address")

task("deployRouterPlus",
    "deploy butter router V2 contract",
    require("./subs/deployRouterPlus.js"))
    .addParam("wtoken", "wtoken address")

task("deploySwapAdapter",
    "deploy SwapAdapter",
    require("./subs/deploySwapAdapter.js"))

task("deployFeeReceiver",
    "deployFeeReceiver",
     require("./subs/deployFeeReceiver.js"))
    .addParam("payees", "payees address array")
    .addParam("shares", "shares array")

task("deployTransferProxy",
    "deployTransferProxy",
    require("./subs/deployTransferProxy.js"))
  
task("setAuthorization",
    "setAuthorization",
    require("./subs/setAuthorization.js")
)
    .addParam("router", "router address")
    .addParam("executors", "executors address array")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)

task("setFee",
    "setFee",
    require("./subs/setFee.js")
)
    .addParam("router", "router address")
    .addParam("feereceiver", "feeReceiver address")
    .addParam("feerate", "feeRate")
    .addParam("fixedfee", "fixedFee")

task("deployAndSetup",
    "deploy router and setup",
    require("./subs/deployAndSetUp.js"))
    .addParam("routertype", "v2 for butterRouterV2, plus for butterRouterPlus")

// <--------------------------------------------------AggregationAdaptor------------------------------------------------------------->

task("deployAggregationAdaptor",
    "deployAggregationAdaptor",
    require("./subs/deployAggregationAdaptor.js"))
    
// <--------------------------------------------------receiver------------------------------------------------------------->
   
task("deployReceiver",
    "deployReceiver",
     require("./subs/deployReceiver.js"))
    .addParam("router", "router address")
    
task("receiverSetUp",
    "receiverSetUp",
    require("./subs/receiverSetUp.js"))
    .addParam("receiver", "receiver address")
    .addParam("name", "router name")
    .addParam("router", "router address")
  