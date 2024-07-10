let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { task } = require("hardhat/config");
let { getConfig } = require("../../configs/config");
let { setAuthorizationV3, setFeeV3, transferOwner } = require("../utils/util.js");
let {
    routerV3,
    deployRouterV3,
    tronSetReferrerMaxFee,
    tronSetAuthorizationV3,
    tronSetFeeV3,
    tronSetAuthFromConfigV3,
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
        let router_addr = deploy_json[network.name]["ButterRouterV3"]["addr"];

        deploy_json = await readFromFile(network.name);
        let adapt_addr = deploy_json[network.name]["SwapAdapter"];

        config.v3.executors.push(adapt_addr);

        let executors_s = config.v3.executors.join(",");

        await hre.run("routerV3:setAuthorization", { router: router_addr, executors: executors_s });

        await hre.run("routerV3:setFee", {
            router: router_addr,
            feereceiver: config.v3.fee.receiver,
            feerate: config.v3.fee.feeRate,
            fixedfee: config.v3.fee.fixedFee,
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

task("routerV3:setAuthFromConfig", "set Authorization from config file")
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
            await tronSetAuthFromConfigV3(hre.artifacts, network.name, taskArgs.router, config);
        } else {
            console.log("\nset Authorization from config file deployer :", deployer);
            let deploy_json = await readFromFile(network.name);

            let router_addr = taskArgs.router;
            if (router_addr === "router") {
                if (deploy_json[network.name]["ButterRouterV3"] === undefined) {
                    throw "can not get router address";
                }
                router_addr = deploy_json[network.name]["ButterRouterV3"]["addr"];
            }
            console.log("router: ", router_addr);

            let adapter_address = deploy_json[network.name]["SwapAdapter"];
            if (adapter_address != undefined) {
                console.log("SwapAdapter: ", adapter_address);
                config.v3.executors.push(adapter_address);
            }

            let Router = await ethers.getContractFactory("ButterRouterV3");
            let router = Router.attach(router_addr);

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

                await setAuthorizationV3(router_addr, executors_s, true);
            }

            console.log("RouterV3 sync authorization from config file.");
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
                router_addr = deploy_json[network.name]["ButterRouterV3"]["addr"];
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
