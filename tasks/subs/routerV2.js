let { create, getTronContract, getTronDeployer } = require("../../utils/create.js");
let { getDeployment, saveDeployment, tronAddressToHex } = require("../../utils/helper.js");
let { getConfig } = require("../../configs/config");
let {
    setAuthorization,
    setOwner,
    acceptOwnership,
    getExecutorList,
    checkAuthorization,
} = require("../common/common.js");
let { verify } = require("../../utils/verify.js");

async function getRouterAddress(router, network) {
    if (!router || router === "") {
        router = await getDeployment(network, "ButterRouterV2");
    }
    return router;
}

module.exports = async (taskArgs, hre) => {
    const { network } = hre;
    let config = getConfig(network.name);
    if (!config) {
        throw "config not set";
    }
    await hre.run("routerV2:deploy", { mos: config.v2.mos, wtoken: config.wToken });
    let router_addr = await getDeployment(network.name, "ButterRouterV2");
    let adapt_addr = await getDeployment(network.name, "SwapAdapter");
    config.v2.executors.push(adapt_addr);
    let executors_s = config.v3.executors.join(",");
    await hre.run("routerV2:setAuthorization", { router: router_addr, executors: executors_s });
    await hre.run("routerV2:setFee", {
        router: router_addr,
        feereceiver: config.v2.fee.receiver,
        feerate: config.v2.fee.feeRate,
        fixedfee: config.v2.fee.fixedFee,
    });
};

task("routerV2:deploy", "deploy butterRouterV2")
    .addParam("mos", "mos address")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let deployer_address;
        let mos;
        let wtoken;
        if (network.name === "Tron" || network.name === "TronTest") {
            mos = tronAddressToHex(taskArgs.mos);
            wtoken = tronAddressToHex(taskArgs.wtoken);
            deployer_address = await getTronDeployer(true, network.name);
        } else {
            deployer_address = deployer.address;
            mos = taskArgs.mos;
            wtoken = taskArgs.wtoken;
        }
        let routerAddr = await create(
            hre,
            deployer,
            "ButterRouterV2",
            ["address", "address", "address"],
            [mos, deployer_address, wtoken],
            salt
        );
        console.log("router v2 address :", routerAddr);
        await saveDeployment(network.name, "ButterRouterV2", routerAddr);
        await verify(
            routerAddr,
            [mos, deployer_address, wtoken],
            "contracts/ButterRouterV2.sol:ButterRouterV2",
            network.config.chainId,
            true
        );
    });

task("routerV2:setAuthorization", "set Authorization")
    .addOptionalParam("router", "router address", "router", types.string)
    .addParam("executors", "executors address array")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let list = await getExecutorList(network.name, taskArgs.executors);
        await setAuthorization("ButterRouterV2", hre.artifacts, network.name, router_addr, list, taskArgs.flag);
    });

task("routerV2:setFee", "set setFee")
    .addOptionalParam("router", "router address", "router", types.string)
    .addParam("feereceiver", "feeReceiver address")
    .addParam("feerate", "feeRate")
    .addParam("fixedfee", "fixedFee")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer :", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV2", hre.artifacts, network.name, router_addr);
            await c.setFee(tronAddressToHex(taskArgs.feereceiver), taskArgs.feerate, taskArgs.fixedfee).send();
        } else {
            console.log("\nsetAuthorization deployer :", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV2");
            let router = Router.attach(router_addr);
            let result = await (await router.setFee(taskArgs.feereceiver, taskArgs.feerate, taskArgs.fixedfee)).wait();
            if (result.status == 1) {
                console.log(
                    `ButterRouterV2 ${router.address} setFee ${taskArgs.feereceiver} : ${taskArgs.feerate} : ${taskArgs.fixedfee} succeed`
                );
            } else {
                console.log("setFee failed");
            }
        }
    });

task("routerV2:setAuthFromConfig", "set Authorization from config file")
    .addOptionalParam("router", "router address", "router", types.string)
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
        let adapter_address = await getDeployment(network, "SwapAdapter");
        if (adapter_address != undefined) {
            console.log("SwapAdapter: ", adapter_address);
            config.v2.executors.push(adapter_address);
        }
        await checkAuthorization("ButterRouterV2", hre.artifacts, network.name, router_addr, config.v2.executors);
    });

task("routerV2:setOwner", "set setFee")
    .addOptionalParam("router", "router address", "", types.string)
    .addParam("owner", "owner address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        await setOwner("ButterRouterV2", hre.artifacts, network.name, router_addr, taskArgs.owner);
    });

task("routerV2:withdraw", "rescueFunds from router")
    .addOptionalParam("router", "router address", "router", types.string)
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
            let c = await getTronContract("ButterRouterV2", hre.artifacts, network.name, router_addr);
            await c.rescueFunds(tronAddressToHex(taskArgs.token), taskArgs.amount).send();
        } else {
            console.log("\nset rescueFunds from config file deployer :", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV2");
            let router = Router.attach(router_addr);
            let result = await (await router.rescueFunds(taskArgs.token, taskArgs.amount)).wait();
            if (result.status === 1) {
                console.log(
                    `ButterRouterV2 ${router.address} rescueFunds ${taskArgs.token} ${taskArgs.amount} succeed`
                );
            } else {
                console.log("rescueFunds failed");
            }
            console.log("RouterV2 rescueFunds.");
        }
    });
