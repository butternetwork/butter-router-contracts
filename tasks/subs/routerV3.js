let { create, getTronContract, getTronDeployer } = require("../../utils/create.js");
let { getDeployment, saveDeployment, tronAddressToHex } = require("../../utils/helper.js");
let { getConfig } = require("../../configs/config");
let {
    setAuthorization,
    setBridge,
    setOwner,
    acceptOwnership,
    getExecutorList,
    checkAuthorization,
    checkBridgeAndWToken,
    removeAuthFromConfig,
    checkFee,
} = require("../common/common.js");
let { verify } = require("../../utils/verify.js");

async function getRouterAddress(router, network) {
    if (!router || router === "") {
        router = await getDeployment(network, "ButterRouterV3");
        if(!router) router = await getDeployment(network, "ButterRouterV4");
    }
    return router;
}

module.exports = async (taskArgs, hre) => {
    const { network } = hre;
    let config = getConfig(network.name);
    if (!config) {
        throw "config not set";
    }
    await hre.run("routerV3:deploy", { bridge: config.v3.bridge, wtoken: config.wToken });
    let router_addr = await getDeployment(network.name, "ButterRouterV4");
    let adapt_addr = await getDeployment(network.name, "SwapAdapterV3");
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
};

task("routerV3:deploy", "deploy butterRouterV3")
    .addParam("bridge", "bridge address")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let deployer_address;
        let bridge;
        let wtoken;
        if (network.name === "Tron" || network.name === "TronTest") {
            bridge = tronAddressToHex(taskArgs.bridge);
            wtoken = tronAddressToHex(taskArgs.wtoken);
            deployer_address = await getTronDeployer(true, network.name);
        } else {
            deployer_address = deployer.address;
            bridge = taskArgs.bridge;
            wtoken = taskArgs.wtoken;
        }
        let salt = process.env.ROUTER_V3_DEPLOY_SALT;
        let routerAddr = await create(
            hre,
            deployer,
            "ButterRouterV4",
            ["address", "address", "address"],
            [bridge, deployer_address, wtoken],
            salt
        );

        console.log("router v3 address :", routerAddr);
        await saveDeployment(network.name, "ButterRouterV4", routerAddr);
        await verify(
            routerAddr,
            [bridge, deployer_address, wtoken],
            "contracts/ButterRouterV4.sol:ButterRouterV4",
            network.config.chainId,
            true
        );
    });

task("routerV3:setAuthorization", "set Authorization")
    .addOptionalParam("router", "router address", "", types.string)
    .addParam("executors", "executors address array")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let list = await getExecutorList(network.name, taskArgs.executors);
        await setAuthorization("ButterRouterV3", hre.artifacts, network.name, router_addr, list, taskArgs.flag);
    });

task("routerV3:setFeeManager", "set fee manager")
    .addOptionalParam("router", "router address", "", types.string)
    .addParam("manager", "manage address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer :", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV3", hre.artifacts, network.name, router_addr);
            await c.setFeeManager(tronAddressToHex(taskArgs.manager)).send();
        } else {
            console.log("\nsetAuthorization deployer :", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV3");
            let router = Router.attach(router_addr);
            let result = await (await router.setFeeManager(taskArgs.manager)).wait();
            if (result.status == 1) {
                console.log(`ButterRouterV3 ${router.address} setFeeManager ${taskArgs.manager} succeed`);
            } else {
                console.log("setFeeManager failed");
            }
        }
    });

task("routerV3:setReferrerMaxFee", "set referrer max fee")
    .addOptionalParam("router", "router address", "", types.string)
    .addParam("rate", "max fee rate")
    .addParam("native", "max native fee")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer :", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV3", hre.artifacts, network.name, router_addr);
            await c.setReferrerMaxFee(taskArgs.rate, taskArgs.native).send();
        } else {
            console.log("\nsetFee deployer :", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV3");
            let router = Router.attach(router_addr);
            await (await router.setReferrerMaxFee(taskArgs.rate, taskArgs.native)).wait();
        }
    });

task("routerV3:setFee", "set setFee")
    .addOptionalParam("router", "router address", "", types.string)
    .addParam("feereceiver", "feeReceiver address")
    .addParam("feerate", "feeRate")
    .addParam("fixedfee", "fixedFee")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer :", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV3", hre.artifacts, network.name, router_addr);
            await c.setFee(tronAddressToHex(taskArgs.feereceiver), taskArgs.feerate, taskArgs.fixedfee).send();
        } else {
            console.log("\nsetFee deployer :", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV3");
            let router = Router.attach(router_addr);
            let result = await (await router.setFee(taskArgs.feereceiver, taskArgs.feerate, taskArgs.fixedfee)).wait();
            if (result.status == 1) {
                console.log(
                    `ButterRouterV3 ${router_addr} setFee rate(${taskArgs.feerate}), fixed(${taskArgs.fixedfee}), receiver(${taskArgs.feereceiver}) succeed`
                );
            } else {
                console.log("setFee failed");
            }
        }
    });

task("routerV3:setBridge", "set setFee")
    .addOptionalParam("router", "router address", "", types.string)
    .addParam("bridge", "bridge address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        await setBridge("ButterRouterV3", hre.artifacts, network.name, router_addr, taskArgs.bridge);
    });

task("routerV3:setOwner", "set setFee")
    .addOptionalParam("router", "router address", "", types.string)
    .addParam("owner", "owner address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        await setOwner("ButterRouterV3", hre.artifacts, network.name, router_addr, taskArgs.owner);
    });

task("routerV3:withdraw", "rescueFunds from router")
    .addOptionalParam("router", "router address", "", types.string)
    .addParam("token", "token address")
    .addParam("amount", "token amount")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }
        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer :", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV3", hre.artifacts, network.name, router_addr);
            await c.rescueFunds(tronAddressToHex(taskArgs.token), taskArgs.amount).send();
        } else {
            console.log("\nset rescueFunds from config file deployer :", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV3");
            let router = Router.attach(router_addr);
            let result = await (await router.rescueFunds(taskArgs.token, taskArgs.amount)).wait();
            if (result.status === 1) {
                console.log(
                    `ButterRouterV3 ${router.address} rescueFunds ${taskArgs.token} ${taskArgs.amount} succeed`
                );
            } else {
                console.log("rescueFunds failed");
            }
            console.log("RouterV3 rescueFunds.");
        }
    });

task("routerV3:update", "check and Update from config file")
    .addOptionalParam("router", "router address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }
        await checkAuthorization("ButterRouterV3", hre.artifacts, network.name, router_addr, config.v3.executors);
        await checkBridgeAndWToken("ButterRouterV3", hre.artifacts, network.name, router_addr, config);
        await checkFee("ButterRouterV3", hre.artifacts, network.name, router_addr, config);
        await hre.run("routerV3:removeAuthFromConfig", { router: router_addr });
    });

task("routerV3:removeAuthFromConfig", "remove Authorization from config file")
    .addOptionalParam("router", "router address", "router", types.string)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let config = getConfig(hre.network.name);
        if (!config) {
            throw "config not set";
        }
        if (!config.removes || config.removes.length === 0) {
            console.log("no removes list");
            return;
        }
        await removeAuthFromConfig("ButterRouterV3", hre.artifacts, network.name, router_addr, config.removes);
        console.log("RouterV3 remove authorization from config file.");
    });

task("routerV3:bridge", "bridge token from router")
    .addOptionalParam("router", "router address", "", types.string)
    .addParam("token", "token address")
    .addParam("amount", "token amount")
    .addParam("chain", "to chain id ")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }
        if (network.name === "Tron" || network.name === "TronTest") {
        } else {
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
