let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { task } = require("hardhat/config");
let { getConfig } = require("../../configs/config");
let { setAuthorizationV2, setFeeV2, transferOwner } = require("../utils/util.js");
let {
    routerV2,
    deployRouterV2,
    tronSetAuthorizationV2,
    tronSetFeeV2,
    tronSetAuthFromConfigV2,
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
        await routerV2(hre.artifacts, network.name, config);
    } else {
        console.log("routerV2 deployer :", deployer);

        await hre.run("routerV2:deploy", { mos: config.v2.mos, wtoken: config.wToken });

        let deploy_json = await readFromFile(network.name);
        let router_addr = deploy_json[network.name]["ButterRouterV2"]["addr"];

        deploy_json = await readFromFile(network.name);
        let adapt_addr = deploy_json[network.name]["SwapAdapter"];

        config.v2.executors.push(adapt_addr);

        let executors_s = config.v2.executors.join(",");

        await hre.run("routerV2:setAuthorization", { router: router_addr, executors: executors_s });

        await hre.run("routerV2:setFee", {
            router: router_addr,
            feereceiver: config.v2.fee.receiver,
            feerate: config.v2.fee.feeRate,
            fixedfee: config.v2.fee.fixedFee,
        });
    }
};

task("routerV2:deploy", "deploy butterRouterV2")
    .addParam("mos", "mos address")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs, hre) => {
        const { getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        let salt = process.env.ROUTER_V2_DEPLOY_SALT;
        let butterRouterV2 = await create(
            hre,
            deployer,
            "ButterRouterV2",
            ["address", "address", "address"],
            [taskArgs.mos, deployer, taskArgs.wtoken],
            salt
        );
        console.log("router v2 address :", butterRouterV2);

        let deploy = await readFromFile(network.name);

        if (!deploy[network.name]["ButterRouterV2"]) {
            deploy[network.name]["ButterRouterV2"] = {};
        }

        deploy[network.name]["ButterRouterV2"]["addr"] = butterRouterV2;

        await writeToFile(deploy);

        const verifyArgs = [taskArgs.mos, deployer, taskArgs.wtoken]
            .map((arg) => (typeof arg == "string" ? `'${arg}'` : arg))
            .join(" ");
        console.log(`To verify, run: npx hardhat verify --network ${network.name} ${butterRouterV2} ${verifyArgs}`);

        await verify(
            butterRouterV2,
            [taskArgs.mos, deployer, taskArgs.wtoken],
            "contracts/ButterRouterV2.sol:ButterRouterV2",
            hre.network.config.chainId,
            true
        );
    });

task("routerV2:setAuthorization", "set Authorization")
    .addParam("router", "router address")
    .addParam("executors", "executors address array")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetAuthorizationV2(
                hre.artifacts,
                network.name,
                taskArgs.router,
                taskArgs.executors,
                taskArgs.flag
            );
        } else {
            console.log("\nsetAuthorization deployer :", deployer);

            await setAuthorizationV2(taskArgs.router, taskArgs.executors, taskArgs.flag);
        }
    });

task("routerV2:setFee", "set setFee")
    .addParam("router", "router address")
    .addParam("feereceiver", "feeReceiver address")
    .addParam("feerate", "feeRate")
    .addParam("fixedfee", "fixedFee")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetFeeV2(
                hre.artifacts,
                network.name,
                taskArgs.router,
                taskArgs.feereceiver,
                taskArgs.feerate,
                taskArgs.fixedfee
            );
        } else {
            console.log("\nsetFee deployer :", deployer);

            await setFeeV2(taskArgs.router, taskArgs.feereceiver, taskArgs.feerate, taskArgs.fixedfee);
        }
    });

task("routerV2:setAuthFromConfig", "set Authorization from config file")
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
            await tronSetAuthFromConfigV2(hre.artifacts, network.name, taskArgs.router, config);
        } else {
            console.log("\nset Authorization from config file deployer :", deployer);
            let deploy_json = await readFromFile(network.name);

            let router_addr = taskArgs.router;
            if (router_addr === "router") {
                if (deploy_json[network.name]["ButterRouterV2"] === undefined) {
                    throw "can not get router address";
                }
                router_addr = deploy_json[network.name]["ButterRouterV2"]["addr"];
            }
            console.log("router: ", router_addr);

            let adapter_address = deploy_json[network.name]["SwapAdapter"];
            if (adapter_address != undefined) {
                console.log("SwapAdapter: ", adapter_address);
                config.v2.executors.push(adapter_address);
            }

            let Router = await ethers.getContractFactory("ButterRouterV2");
            let router = Router.attach(router_addr);

            let executors = [];
            for (let i = 0; i < config.v2.executors.length; i++) {
                let result = await await router.approved(config.v2.executors[i]);

                if (result === false || result === undefined) {
                    executors.push(config.v2.executors[i]);
                }
            }

            if (executors.length > 0) {
                let executors_s = executors.join(",");

                console.log("routers to set :", executors_s);

                await setAuthorization(router_addr, executors_s, true);
            }

            console.log("RouterV2 sync authorization from config file.");
        }
    });

task("routerV2:setOwner", "set setFee")
    .addParam("router", "router address")
    .addParam("owner", "owner address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetFee(
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

task("routerV2:withdraw", "rescueFunds from router")
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
                if (deploy_json[network.name]["ButterRouterV2"] === undefined) {
                    throw "can not get router address";
                }
                router_addr = deploy_json[network.name]["ButterRouterV2"]["addr"];
            }
            console.log("router: ", router_addr);

            let Router = await ethers.getContractFactory("ButterRouterV2");
            let router = Router.attach(router_addr);

            let result;

            result = await (await router.rescueFunds(taskArgs.token, taskArgs.amount)).wait();

            if (result.status == 1) {
                console.log(`Router ${router.address} rescueFunds ${taskArgs.token} ${taskArgs.amount} succeed`);
            } else {
                console.log("rescueFunds failed");
            }

            console.log("RouterV2 rescueFunds.");
        }
    });
