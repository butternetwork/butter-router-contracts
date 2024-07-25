let { create, readFromFile, writeToFile } = require("../../utils/create.js");
let { task } = require("hardhat/config");
let { getConfig } = require("../../configs/config");
let { setAuthorizationV3, setFeeV3, transferOwner, setBridge } = require("../utils/util.js");
let {
    routerV3,
    tronSetReferrerMaxFee,
    tronSetAuthorizationV3,
    tronSetFeeV3,
    tronCheckAndUpdateFromConfig,
    tronSetFeeManager,
} = require("../utils/tron.js");
let { verify } = require("../utils/verify.js");

module.exports = async (taskArgs, hre) => {
    const { getNamedAccounts, network } = hre;
    const { deployer } = await getNamedAccounts();
    let config = getConfig(network.name);
    if (!config) {
        throw "config not set";
    }

    if (network.name === "Tron" || network.name === "TronTest") {
        await routerV3(hre.artifacts, network.name, config);
    } else {
        console.log("routerV3 deployer :", deployer);

        await hre.run("routerV3:deploy", { bridge: config.v3.bridge, wtoken: config.wToken });

        let deploy_json = await readFromFile(network.name);
        let router_addr = deploy_json[network.name]["ButterRouterV3"];

        deploy_json = await readFromFile(network.name);
        let adapt_addr = deploy_json[network.name]["SwapAdapterV3"];

        config.v3.executors.push(adapt_addr);

        let executors_s = config.v3.executors.join(",");

        await hre.run("routerV3:setAuthorization", { router: router_addr, executors: executors_s });

        await hre.run("routerV3:setFee", {
            router: router_addr,
            feereceiver: config.v3.fee.receiver,
            feerate: config.v3.fee.routerFeeRate,
            fixedfee: config.v3.fee.routerFixedFee,
        });

        await hre.run("routerV3:setReferrerMaxFee", {
            router: router_addr,
            rate: config.v3.fee.maxReferrerFeeRate,
            native: config.v3.fee.maxReferrerNativeFee,
        });
    }
};

task("routerV3:deploy", "deploy butterRouterV3")
    .addParam("bridge", "bridge address")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];

        let salt = process.env.ROUTER_V3_DEPLOY_SALT;
        let routerAddr = await create(
            hre,
            deployer,
            "ButterRouterV3",
            ["address", "address", "address"],
            [taskArgs.bridge, deployer.address, taskArgs.wtoken],
            salt
        );

        console.log("router v3 address :", routerAddr);

        let deployments = await readFromFile(hre.network.name);
        deployments[hre.network.name]["ButterRouterV3"] = routerAddr;
        await writeToFile(deployments);

        await verify(
            hre,
            routerAddr,
            [taskArgs.bridge, deployer.address, taskArgs.wtoken],
            "contracts/ButterRouterV3.sol:ButterRouterV3",
            true
        );
    });

task("routerV3:setAuthorization", "set Authorization")
    .addParam("router", "router address")
    .addParam("executors", "executors address array")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetAuthorizationV3(
                hre.artifacts,
                network.name,
                taskArgs.router,
                taskArgs.executors,
                taskArgs.flag
            );
        } else {
            console.log("\nsetAuthorization deployer :", deployer);

            await setAuthorizationV3(taskArgs.router, taskArgs.executors, taskArgs.flag);
        }
    });

task("routerV3:setFeeManager", "set fee manager")
    .addParam("router", "router address")
    .addParam("manager", "manage address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetFeeManager(hre.artifacts, network.name, taskArgs.router, taskArgs.manager);
        } else {
            console.log("\nsetAuthorization deployer :", deployer);

            let Router = await ethers.getContractFactory("ButterRouterV3");

            let router = Router.attach(taskArgs.router);

            let result = await (await router.setFeeManager(taskArgs.manager)).wait();

            if (result.status == 1) {
                console.log(`ButterRouterV3 ${router.address} setFeeManager ${taskArgs.manager} succeed`);
            } else {
                console.log("setFeeManager failed");
            }
        }
    });

task("routerV3:setReferrerMaxFee", "set referrer max fee")
    .addParam("router", "router address")
    .addParam("rate", "max fee rate")
    .addParam("native", "max native fee")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetReferrerMaxFee(hre.artifacts, network.name, taskArgs.router, taskArgs.rate, taskArgs.native);
        } else {
            console.log("\nsetFee deployer :", deployer);
            let Router = await ethers.getContractFactory("ButterRouterV3");
            let router = Router.attach(taskArgs.router);
            await (await router.setReferrerMaxFee(taskArgs.rate, taskArgs.native)).wait();
        }
    });

task("routerV3:setFee", "set setFee")
    .addParam("router", "router address")
    .addParam("feereceiver", "feeReceiver address")
    .addParam("feerate", "feeRate")
    .addParam("fixedfee", "fixedFee")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetFeeV3(
                hre.artifacts,
                network.name,
                taskArgs.router,
                taskArgs.feereceiver,
                taskArgs.feerate,
                taskArgs.fixedfee
            );
        } else {
            console.log("\nsetFee deployer :", deployer);

            await setFeeV3(taskArgs.router, taskArgs.feereceiver, taskArgs.feerate, taskArgs.fixedfee);
        }
    });

task("routerV3:setBridge", "set setFee")
    .addParam("router", "router address")
    .addParam("bridge", "bridge address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetFeeV3(hre.artifacts, network.name, taskArgs.router, taskArgs.bridge);
        } else {
            console.log("\nset bridge :", taskArgs.bridge);

            await setBridge(taskArgs.router, taskArgs.bridge);
        }
    });

task("routerV3:setOwner", "set setFee")
    .addParam("router", "router address")
    .addParam("owner", "owner address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetFeeV3(
                hre.artifacts,
                network.name,
                taskArgs.router,
                taskArgs.feereceiver,
                taskArgs.feerate,
                taskArgs.fixedfee
            );
        } else {
            console.log("\nsetFee owner :", taskArgs.owner);

            await transferOwner(taskArgs.router, taskArgs.owner);
        }
    });

task("routerV3:withdraw", "rescueFunds from router")
    .addOptionalParam("router", "router address", "router", types.string)
    .addParam("token", "token address")
    .addParam("amount", "token amount")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }
        if (network.name === "Tron" || network.name === "TronTest") {
        } else {
            console.log("\nset rescueFunds from config file deployer :", deployer);
            let deploy_json = await readFromFile(network.name);

            let router_addr = taskArgs.router;
            if (router_addr === "router") {
                if (deploy_json[network.name]["ButterRouterV3"] === undefined) {
                    throw "can not get router address";
                }
                router_addr = deploy_json[network.name]["ButterRouterV3"];
            }
            console.log("router: ", router_addr);

            let Router = await ethers.getContractFactory("ButterRouterV3");
            let router = Router.attach(router_addr);

            let result;

            result = await (await router.rescueFunds(taskArgs.token, taskArgs.amount)).wait();

            if (result.status === 1) {
                console.log(`Router ${router.address} rescueFunds ${taskArgs.token} ${taskArgs.amount} succeed`);
            } else {
                console.log("rescueFunds failed");
            }

            console.log("RouterV3 rescueFunds.");
        }
    });

task("routerV3:update", "check and Update from config file")
    .addOptionalParam("router", "router address", "router", types.string)
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }
        if (network.name === "Tron" || network.name === "TronTest") {
            await tronCheckAndUpdateFromConfig(hre.artifacts, network.name, taskArgs.router, config);
        } else {
            console.log("\nset Authorization from config file deployer :", deployer);
            let deploy_json = await readFromFile(network.name);

            let router_addr = taskArgs.router;
            if (router_addr === "router") {
                if (deploy_json[network.name]["ButterRouterV3"] === undefined) {
                    throw "can not get router address";
                }
                router_addr = deploy_json[network.name]["ButterRouterV3"];
            }
            console.log("router: ", router_addr);

            let Router = await ethers.getContractFactory("ButterRouterV3");
            let router = Router.attach(router_addr);
            await checkAuthorization(router, config, deploy_json);
            await checkFee(router, config);
            await checkBridgeAndWToken(router, config);
        }
    });

async function checkAuthorization(router, config, deploy_json) {
    let adapter_address = deploy_json[network.name]["SwapAdapterV3"];
    if (adapter_address != undefined) {
        console.log("SwapAdapter: ", adapter_address);
        config.v3.executors.push(adapter_address);
    }
    let executors = [];
    for (let i = 0; i < config.v3.executors.length; i++) {
        let result = await await router.approved(config.v3.executors[i]);

        if (result === false || result === undefined) {
            executors.push(config.v3.executors[i]);
        }
    }
    if (executors.length > 0) {
        let executors_s = executors.join(",");

        console.log("routers to set :", executors_s);

        await setAuthorizationV3(router.address, executors_s, true);
    }

    console.log("RouterV3 sync authorization from config file.");
}

async function checkFee(router, config) {
    let feeReceiver = await router.feeReceiver();
    let routerFixedFee = await router.routerFixedFee();
    let routerFeeRate = await router.routerFeeRate();

    console.log("pre feeReceiver", feeReceiver);
    console.log("pre routerFixedFee", routerFixedFee);
    console.log("pre routerFeeRate", routerFeeRate);

    if (
        feeReceiver.toLowerCase() !== config.v3.fee.receiver.toLowerCase() ||
        routerFixedFee.toString() !== config.v3.fee.routerFixedFee ||
        routerFeeRate.toString() !== config.v3.fee.routerFeeRate
    ) {
        await (
            await router.setFee(config.v3.fee.receiver, config.v3.fee.routerFeeRate, config.v3.fee.routerFixedFee)
        ).wait();

        console.log("feeReceiver", await router.feeReceiver());
        console.log("routerFixedFee", await router.routerFixedFee());
        console.log("routerFeeRate", await router.routerFeeRate());
    }
    let maxFeeRate = await router.maxFeeRate();
    let maxNativeFee = await router.maxNativeFee();
    console.log("pre maxFeeRate", maxFeeRate);
    console.log("pre maxNativeFee", maxNativeFee);
    if (
        maxFeeRate.toString() !== config.v3.fee.maxReferrerFeeRate ||
        maxNativeFee.toString() !== config.v3.fee.maxReferrerNativeFee
    ) {
        await (
            await router.setReferrerMaxFee(config.v3.fee.maxReferrerFeeRate, config.v3.fee.maxReferrerNativeFee)
        ).wait();
        console.log("maxFeeRate", await router.maxFeeRate());
        console.log("maxNativeFee", await router.maxNativeFee());
    }
}

async function checkBridgeAndWToken(router, config) {
    let wToken = await router.wToken();

    console.log("pre wToken", wToken);
    if (wToken.toLowerCase() !== config.wToken.toLowerCase()) {
        await (await router.setWToken(config.wToken)).wait();
        console.log("wToken", await router.wToken());
    }

    let bridgeAddress = await router.bridgeAddress();
    console.log("pre bridgeAddress", bridgeAddress);
    if (bridgeAddress.toLowerCase() !== config.v3.bridge.toLowerCase()) {
        await (await router.setBridgeAddress(config.v3.bridge)).wait();
        console.log("bridgeAddress", await router.bridgeAddress());
    }
}

task("routerV3:bridge", "bridge token from router")
    .addOptionalParam("router", "router address", "router", types.string)
    .addParam("token", "token address")
    .addParam("amount", "token amount")
    .addParam("chain", "to chain id ")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }
        if (network.name === "Tron" || network.name === "TronTest") {
        } else {
            console.log("\nbridge from config file deployer :", deployer);
            let deploy_json = await readFromFile(network.name);

            let router_addr = taskArgs.router;
            if (router_addr === "router") {
                if (deploy_json[network.name]["ButterRouterV3"] === undefined) {
                    throw "can not get router address";
                }
                router_addr = deploy_json[network.name]["ButterRouterV3"];
            }
            console.log("router: ", router_addr);

            let Router = await ethers.getContractFactory("ButterRouterV3");
            let router = Router.attach(router_addr);

            let token = await ethers.getContractAt("MockToken", taskArgs.token);
            let decimals = await token.decimals();
            let value = ethers.utils.parseUnits(taskArgs.amount, decimals);

            let bridge = ethers.utils.AbiCoder.prototype.encode(
                ["uint256", "uint256", "bytes", "bytes"],
                [taskArgs.chain, 0, deployer, []]
            );
            console.log(bridge);

            let bridgeData = ethers.utils.solidityPack(["uint256", "bytes"], [0x20, bridge]);

            console.log(bridgeData);

            let approved = await token.allowance(deployer, router.address);
            console.log("approved ", approved);
            if (approved.lt(value)) {
                console.log(`${taskArgs.token} approve ${router.address} value [${value}] ...`);
                await (await token.approve(router.address, value)).wait();
            }

            let result;
            result = await (
                await router.swapAndBridge(
                    ethers.constants.HashZero,
                    deployer,
                    taskArgs.token,
                    value,
                    [],
                    bridgeData,
                    [],
                    []
                )
            ).wait();
            if (result.status === 1) {
                console.log(`Router ${router.address} rescueFunds ${taskArgs.token} ${taskArgs.amount} succeed`);
            } else {
                console.log("rescueFunds failed");
            }

            console.log("RouterV3 rescueFunds.");
        }
    });
