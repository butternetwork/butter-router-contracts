let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { task } = require("hardhat/config");
let { getConfig } = require("../../configs/config");
let { setAuthorizationV3, setFeeV3, transferOwner } = require("../utils/util.js");
let {
    routerV3,
    deployRouterV3,
    tronSetAuthorizationV3,
    tronSetFeeV3,
    tronSetAuthFromConfigV3,
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

        await hre.run("routerV3:deploy", { mos: config.v3.bridge, wtoken: config.wToken });

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
        const { getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();

        if (network.name === "Tron" || network.name === "TronTest") {
            await deployRouterV3(hre.artifacts, network.name, taskArgs.bridge, taskArgs.wtoken);
        } else {
            console.log("\ndeploy deployer :", deployer);
            let chainId = await hre.network.config.chainId;
            let v3;
            if (chainId === 324 || chainId === 280) {
                v3 = await createZk("ButterRouterV3", [taskArgs.bridge, deployer, taskArgs.wtoken], hre);
            } else {
                let salt = process.env.ROUTER_V3_DEPLOY_SALT;
                let ButterRouterV3 = await ethers.getContractFactory("ButterRouterV3");
                let param = ethers.utils.defaultAbiCoder.encode(
                    ["address", "address", "address"],
                    [taskArgs.bridge, deployer, taskArgs.wtoken]
                );
                let result = await create(salt, ButterRouterV3.bytecode, param);
                v3 = result[0];
            }
            console.log("router v3 address :", v3);
            let deploy = await readFromFile(network.name);

            if (!deploy[network.name]["ButterRouterV3"]) {
                deploy[network.name]["ButterRouterV3"] = {};
            }

            deploy[network.name]["ButterRouterV3"]["addr"] = v3;

            await writeToFile(deploy);

            const verifyArgs = [taskArgs.bridge, deployer, taskArgs.wtoken]
                .map((arg) => (typeof arg == "string" ? `'${arg}'` : arg))
                .join(" ");
            console.log(`To verify, run: npx hardhat verify --network ${network.name} ${v3} ${verifyArgs}`);

            await verify(
                v3,
                [taskArgs.bridge, deployer, taskArgs.wtoken],
                "contracts/ButterRouterV3.sol:ButterRouterV3",
                chainId,
                true
            );
        }
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

            if (result.status == 1) {
                console.log(`Router ${router.address} rescueFunds ${taskArgs.token} ${taskArgs.amount} succeed`);
            } else {
                console.log("rescueFunds failed");
            }

            console.log("RouterV3 rescueFunds.");
        }
    });
