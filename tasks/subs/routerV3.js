const { getConfig } = require("../../configs/config.js");
const {
    getBridge, getDeploy, saveDeploy,
    getContract, getDeployerAddr, isTronNetwork, tronToHex, tronFromHex,
    createDeployer,
} = require("../utils/helper.js");
const {
    setAuthorization, setBridge, setOwner, removeAuth, checkFee,
} = require("../common/common.js");

const CONTRACT = "ButterRouterV3";

async function getRouterAddress(router, hre) {
    if (router && router !== "") return router;
    return getDeploy(hre.network.name, CONTRACT);
}

// ============================================================
// Main orchestration task
// ============================================================
module.exports = async (taskArgs, hre) => {
    const { network } = hre;
    let config = getConfig(network.name);
    if (!config) throw "config not set";

    let bridge = getBridge(network.name, config);

    await hre.run("routerV3:deploy", { bridge, wtoken: config.wToken });

    let router_addr = await getDeploy(network.name, CONTRACT);
    let adapt_addr;
    try { adapt_addr = await getDeploy(network.name, "SwapAdapterV3", "prod"); } catch (e) {}
    if (!adapt_addr) {
        console.log("SwapAdapterV3 not found, deploying...");
        await hre.run("deploySwapAdapter");
        adapt_addr = await getDeploy(network.name, "SwapAdapterV3", "prod");
    }

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

    console.log("ButterRouterV3 deployment and setup completed!");
};

// ============================================================
// Deploy
// ============================================================
task("routerV3:deploy", "Deploy ButterRouterV3 contract")
    .addParam("bridge", "Bridge contract address")
    .addParam("wtoken", "Wrapped token address")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let deployer = createDeployer(hre, { autoVerify: true });
        let deployerAddr = await getDeployerAddr(hre);

        let result;
        if (isTronNetwork(network.name)) {
            let bridge = tronToHex(taskArgs.bridge);
            let wtoken = tronToHex(taskArgs.wtoken);
            result = await deployer.deploy(CONTRACT, [bridge, deployerAddr, wtoken]);
        } else {
            let salt = process.env.ROUTER_V3_DEPLOY_SALT || "";
            result = await deployer.deploy(CONTRACT, [taskArgs.bridge, deployerAddr, taskArgs.wtoken], salt);
        }
        console.log(`${CONTRACT} address: ${result.address}`);
        await saveDeploy(network.name, CONTRACT, result.address);
    });

// ============================================================
// Configuration tasks (delegate to common functions)
// ============================================================
task("routerV3:setAuthorization", "Set executor authorization")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("executors", "Comma-separated executor addresses")
    .addOptionalParam("flag", "Authorization flag", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        let list = taskArgs.executors.split(",").map(e => e.trim());
        await setAuthorization(hre, CONTRACT, addr, list, taskArgs.flag);
    });

task("routerV3:setFeeManager", "Set fee manager")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("manager", "Fee manager address")
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        let router = await getContract(CONTRACT, hre, addr);

        if (isTronNetwork(hre.network.name)) {
            let manager = tronToHex(taskArgs.manager);
            let current = tronToHex(await router.feeManager().call());
            if (current.toLowerCase() === manager.toLowerCase()) {
                console.log(`${CONTRACT} ${addr} feeManager already set`);
                return;
            }
            await router.setFeeManager(manager).sendAndWait();
        } else {
            let current = await router.feeManager();
            if (current.toLowerCase() === taskArgs.manager.toLowerCase()) {
                console.log(`${CONTRACT} ${addr} feeManager already set`);
                return;
            }
            await (await router.setFeeManager(taskArgs.manager)).wait();
        }
        console.log(`${CONTRACT} ${addr} setFeeManager ${taskArgs.manager}`);
    });

task("routerV3:setReferrerMaxFee", "Set maximum referrer fee")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("rate", "Maximum fee rate")
    .addParam("native", "Maximum native fee")
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        let router = await getContract(CONTRACT, hre, addr);

        if (isTronNetwork(hre.network.name)) {
            let currentRate = await router.maxFeeRate().call();
            let currentNative = await router.maxNativeFee().call();
            if (currentRate.toString() === taskArgs.rate && currentNative.toString() === taskArgs.native) {
                console.log(`${CONTRACT} ${addr} referrerMaxFee already up-to-date`);
                return;
            }
            await router.setReferrerMaxFee(taskArgs.rate, taskArgs.native).sendAndWait();
        } else {
            let currentRate = await router.maxFeeRate();
            let currentNative = await router.maxNativeFee();
            if (currentRate.toString() === taskArgs.rate && currentNative.toString() === taskArgs.native) {
                console.log(`${CONTRACT} ${addr} referrerMaxFee already up-to-date`);
                return;
            }
            await (await router.setReferrerMaxFee(taskArgs.rate, taskArgs.native)).wait();
        }
        console.log(`${CONTRACT} ${addr} setReferrerMaxFee rate(${taskArgs.rate}) native(${taskArgs.native})`);
    });

task("routerV3:setFee", "Set router fees")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("feereceiver", "Fee receiver address")
    .addParam("feerate", "Fee rate")
    .addParam("fixedfee", "Fixed fee amount")
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        let router = await getContract(CONTRACT, hre, addr);

        if (isTronNetwork(hre.network.name)) {
            let receiver = tronToHex(taskArgs.feereceiver);
            let currentReceiver = tronToHex(await router.feeReceiver().call());
            let currentRate = await router.routerFeeRate().call();
            let currentFixed = await router.routerFixedFee().call();
            if (
                currentReceiver.toLowerCase() === receiver.toLowerCase() &&
                currentRate.toString() === taskArgs.feerate &&
                currentFixed.toString() === taskArgs.fixedfee
            ) {
                console.log(`${CONTRACT} ${addr} fee already up-to-date`);
                return;
            }
            await router.setFee(receiver, taskArgs.feerate, taskArgs.fixedfee).sendAndWait();
        } else {
            let currentReceiver = await router.feeReceiver();
            let currentRate = await router.routerFeeRate();
            let currentFixed = await router.routerFixedFee();
            if (
                currentReceiver.toLowerCase() === taskArgs.feereceiver.toLowerCase() &&
                currentRate.toString() === taskArgs.feerate &&
                currentFixed.toString() === taskArgs.fixedfee
            ) {
                console.log(`${CONTRACT} ${addr} fee already up-to-date`);
                return;
            }
            await (await router.setFee(taskArgs.feereceiver, taskArgs.feerate, taskArgs.fixedfee)).wait();
        }
        console.log(`${CONTRACT} ${addr} setFee rate(${taskArgs.feerate}) fixed(${taskArgs.fixedfee}) receiver(${taskArgs.feereceiver})`);
    });

task("routerV3:setBridge", "Set bridge address")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("bridge", "Bridge contract address")
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        await setBridge(hre, CONTRACT, addr, taskArgs.bridge);
    });

task("routerV3:setOwner", "Transfer ownership")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("owner", "New owner address")
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        await setOwner(hre, CONTRACT, addr, taskArgs.owner);
    });

// ============================================================
// Operation tasks
// ============================================================
task("routerV3:rescueFunds", "Rescue funds from router")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("token", "Token address")
    .addParam("amount", "Token amount")
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        let router = await getContract(CONTRACT, hre, addr);

        if (isTronNetwork(hre.network.name)) {
            await router.rescueFunds(tronToHex(taskArgs.token), taskArgs.amount).sendAndWait();
        } else {
            await (await router.rescueFunds(taskArgs.token, taskArgs.amount)).wait();
        }
        console.log(`${CONTRACT} ${addr} rescueFunds ${taskArgs.token} ${taskArgs.amount}`);
    });

// ============================================================
// Update (delegates to common functions)
// ============================================================
task("routerV3:update", "Check and update from config file")
    .addOptionalParam("router", "Router address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        let config = getConfig(hre.network.name);
        if (!config) throw "config not set";

        let adapt_addr;
        try { adapt_addr = await getDeploy(hre.network.name, "SwapAdapterV3", "prod"); } catch (e) {}
        let executors = [...config.v3.executors];
        if (adapt_addr) executors.push(adapt_addr);

        await setAuthorization(hre, CONTRACT, addr, executors);

        let bridge = getBridge(hre.network.name, config);
        await setBridge(hre, CONTRACT, addr, bridge);

        await checkFee(hre, CONTRACT, addr, config.v3.fee);

        await removeAuth(hre, CONTRACT, addr, config.removes);
        console.log("RouterV3 update completed.");
    });

task("routerV3:removeAuthFromConfig", "Remove authorization from config")
    .addOptionalParam("router", "Router address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        let config = getConfig(hre.network.name);
        if (!config) throw "config not set";
        await removeAuth(hre, CONTRACT, addr, config.removes);
    });

// ============================================================
// Bridge & Info
// ============================================================
task("routerV3:bridge", "Bridge tokens")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("token", "Token address")
    .addParam("amount", "Token amount")
    .addParam("chain", "Target chain ID")
    .setAction(async (taskArgs, hre) => {
        const { ethers } = hre;
        if (isTronNetwork(hre.network.name)) {
            console.log("Tron bridge not implemented yet");
            return;
        }

        let addr = await getRouterAddress(taskArgs.router, hre);
        let [signer] = await ethers.getSigners();
        let router = await getContract(CONTRACT, hre, addr);
        let token = await ethers.getContractAt("MockToken", taskArgs.token);
        let decimals = await token.decimals();
        let value = ethers.parseUnits(taskArgs.amount, decimals);

        let bridge = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "bytes", "bytes"],
            [taskArgs.chain, 0, signer.address, "0x"]
        );
        let bridgeData = ethers.solidityPacked(["uint256", "bytes"], [0x20, bridge]);

        let approved = await token.allowance(signer.address, addr);
        if (approved < value) {
            console.log(`Approving ${taskArgs.token}...`);
            await (await token.approve(addr, value)).wait();
        }

        let result = await (await router.swapAndBridge(
            ethers.ZeroHash, signer.address, taskArgs.token, value, [], bridgeData, [], []
        )).wait();

        if (result.status === 1) {
            console.log(`Bridge succeeded. tx: ${result.hash}`);
        } else {
            console.log("Bridge failed");
        }
    });

task("routerV3:info", "Display contract information")
    .addOptionalParam("router", "Router address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        let addr = await getRouterAddress(taskArgs.router, hre);
        let router = await getContract(CONTRACT, hre, addr);

        console.log("=== ButterRouterV3 Contract Information ===");
        console.log("Address:", addr);
        if (isTronNetwork(hre.network.name)) {
            console.log("Bridge:", tronFromHex(await router.bridgeAddress().call()));
            console.log("Fee Manager:", tronFromHex(await router.feeManager().call()));
            console.log("Owner:", tronFromHex(await router.owner().call()));
            console.log("Fee Receiver:", tronFromHex(await router.feeReceiver().call()));
            console.log("Fee Rate:", (await router.routerFeeRate().call()).toString());
            console.log("Fixed Fee:", (await router.routerFixedFee().call()).toString());
            console.log("Max Fee Rate:", (await router.maxFeeRate().call()).toString());
            console.log("Max Native Fee:", (await router.maxNativeFee().call()).toString());
        } else {
            console.log("Bridge:", await router.bridgeAddress());
            console.log("Fee Manager:", await router.feeManager());
            console.log("Owner:", await router.owner());
            console.log("Fee Receiver:", await router.feeReceiver());
            console.log("Fee Rate:", (await router.routerFeeRate()).toString());
            console.log("Fixed Fee:", (await router.routerFixedFee()).toString());
            console.log("Max Fee Rate:", (await router.maxFeeRate()).toString());
            console.log("Max Native Fee:", (await router.maxNativeFee()).toString());
        }
    });
