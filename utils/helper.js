// const hre = require("hardhat");
let offsets = require("../configs/offsets.json");
let stargate = require("../configs/stargate.json");
let xy = require("../configs/xy.json");
let symbiosis = require("../configs/symbiosis.json");

exports.updateSelectorInfo = async function (rubicAdapter_addr, network) {
    console.log("updateSelectorInfo ........start");
    const RubicAdapter = await hre.ethers.getContractFactory("AggregationAdaptor");
    const adapter = RubicAdapter.attach(rubicAdapter_addr);
    let config = offsets[network];

    let _routers = new Array();
    let _selectors = new Array();
    let _infos = new Array();

    if (!config) {
        console.log("unsupport network ....");
        return;
    }

    for (let i = 0; i < config.length; i++) {
        if (config[i].isAvailable === true) {
            _routers.push(config[i].router);
            _selectors.push(config[i].selector);
            _infos.push({
                offset: config[i].offset,
                isAvailable: config[i].isAvailable,
            });
        }
    }

    let result = await (await adapter.updateSelectorInfo(_routers, _selectors, _infos)).wait();

    if (result.status === 1) {
        console.log("updateSelectorInfo succsece");
    } else {
        console.log("updateSelectorInfo fail");
    }
};

exports.setRouters = async function (rubicAdapter_addr, network) {
    console.log("setRouters ........start");
    const RubicAdapter = await hre.ethers.getContractFactory("AggregationAdaptor");
    const adapter = RubicAdapter.attach(rubicAdapter_addr);
    let stargateRouter = stargate.routers[network]
        ? stargate.routers[network]
        : "0x0000000000000000000000000000000000000000";
    let xRouter = xy.config[network].XSwapper
        ? xy.config[network].XSwapper
        : "0x0000000000000000000000000000000000000000";
    let symbiosisMetaRouter = symbiosis.config[network].metaRouter
        ? symbiosis.config[network].metaRouter
        : "0x0000000000000000000000000000000000000000";
    let symbiosisGateway = symbiosis.config[network].gateway
        ? symbiosis.config[network].gateway
        : "0x0000000000000000000000000000000000000000";

    // console.log("stargateRouter",stargateRouter)
    // console.log("xRouter",xRouter)
    // console.log("symbiosisMetaRouter",symbiosisMetaRouter)
    // console.log("symbiosisGateway",symbiosisGateway)
    let result = await (
        await adapter.setRouters(symbiosisMetaRouter, symbiosisGateway, stargateRouter, xRouter)
    ).wait();

    if (result.status === 1) {
        console.log("setRouters succsece");
    } else {
        console.log("setRouters fail");
    }
};

exports.setStargatePoolId = async function (rubicAdapter_addr, network) {
    console.log("setStargatePoolId ........start");
    const RubicAdapter = await hre.ethers.getContractFactory("AggregationAdaptor");
    const adapter = RubicAdapter.attach(rubicAdapter_addr);
    let _poolIds = stargate.pools[network];
    if (!_poolIds) {
        console.log("unsupport network ....");
        return;
    }

    let poolIds = new Array();

    for (let i = 0; i < _poolIds.length; i++) {
        poolIds.push({
            token: _poolIds[i].address,
            poolId: _poolIds[i].id,
        });
    }

    console.log(_poolIds);
    let result = await (await adapter.setStargatePoolId(poolIds)).wait();

    if (result.status === 1) {
        console.log("setStargatePoolId succsece");
    } else {
        console.log("setLayerZeroChainId fail");
    }
};

exports.setLayerZeroChainId = async function (rubicAdapter_addr, network) {
    console.log("setLayerZeroChainId ........start");
    const RubicAdapter = await hre.ethers.getContractFactory("AggregationAdaptor");
    const adapter = RubicAdapter.attach(rubicAdapter_addr);
    if (!stargate.chains) {
        console.log("unsupport network ....");
        return;
    }
    let _chainIds = new Array();
    for (let i = 0; i < stargate.chains.length; i++) {
        _chainIds.push({
            chainId: stargate.chains[i].chainId,
            layerZeroChainId: stargate.chains[i].lzChainId,
        });
    }

    let result = await (await adapter.setLayerZeroChainId(_chainIds)).wait();

    if (result.status === 1) {
        console.log("setLayerZeroChainId succsece");
    } else {
        console.log("setLayerZeroChainId fail");
    }
};
