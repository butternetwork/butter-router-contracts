const { createDeployer, getDeployerAddr, getContract, getDeploy, saveDeploy, isTronNetwork, tronToHex } = require("../utils/helper.js");
const { getFeeManagerConfig } = require("../../configs/FeeManagerConfig.js");

task("IntegratorManager:deploy", "deploy IntegratorManager").setAction(async (taskArgs, hre) => {
    const { network } = hre;
    const salt = process.env.FEE_MANAGER_SALT;
    const deployer_address = await getDeployerAddr(hre);

    let integratorManager;
    if (isTronNetwork(network.name)) {
        // Tron: no salt
        integratorManager = await createDeployer(hre, { autoVerify: true }).deploy("IntegratorManager", [deployer_address]);
    } else {
        integratorManager = await createDeployer(hre, { autoVerify: true }).deploy("IntegratorManager", [deployer_address], salt);
    }

    console.log("IntegratorManager address:", integratorManager.address);
    await saveDeploy(network.name, "IntegratorManager", integratorManager.address);
    await hre.run("IntegratorManager:setRouterFeeFromConfig", {});
});

task("IntegratorManager:setRouterFeeFromConfig", "setRouterFee from config").setAction(async (taskArgs, hre) => {
    const { network } = hre;
    let feeManagerConfig = getFeeManagerConfig(network.name);
    if (!feeManagerConfig) throw "set feeManager config first";

    await hre.run("IntegratorManager:setRouterFee", {
        receiver: feeManagerConfig.receiver,
        fixednative: feeManagerConfig.fixedNative,
        tokenfeerate: feeManagerConfig.tokenFeeRate,
        routershare: feeManagerConfig.routerShare,
        routernativeshare: feeManagerConfig.routerNativeShare,
    });
});

task("IntegratorManager:setRouterFee", "setRouterFee feeManager")
    .addParam("receiver", "fee receiver")
    .addParam("fixednative", "fixedNative")
    .addParam("tokenfeerate", "tokenFeeRate")
    .addParam("routershare", "router share of token fee")
    .addParam("routernativeshare", "router share of native fee")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "IntegratorManager");
        if (!addr) throw "IntegratorManager not deployed";

        let c = await getContract("IntegratorManager", hre, addr);

        if (isTronNetwork(network.name)) {
            await c
                .setRouterFee(
                    tronToHex(taskArgs.receiver),
                    taskArgs.fixednative,
                    taskArgs.tokenfeerate,
                    taskArgs.routershare,
                    taskArgs.routernativeshare
                )
                .sendAndWait();
        } else {
            await (
                await c.setRouterFee(
                    taskArgs.receiver,
                    taskArgs.fixednative,
                    taskArgs.tokenfeerate,
                    taskArgs.routershare,
                    taskArgs.routernativeshare
                )
            ).wait();
        }
        console.log("IntegratorManager setRouterFee done");
    });

task("IntegratorManager:setIntegratorFee", "setIntegratorFee feeManager")
    .addParam("integrator", "integrator address")
    .addParam("receiver", "fee receiver")
    .addParam("fixednative", "fixedNative")
    .addParam("tokenfeerate", "tokenFeeRate")
    .addParam("routershare", "router share")
    .addParam("routernativeshare", "router share of native fee")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "IntegratorManager");
        if (!addr) throw "IntegratorManager not deployed";

        let c = await getContract("IntegratorManager", hre, addr);

        if (isTronNetwork(network.name)) {
            await c
                .setIntegratorFee(
                    tronToHex(taskArgs.integrator),
                    tronToHex(taskArgs.receiver),
                    taskArgs.fixednative,
                    taskArgs.tokenfeerate,
                    taskArgs.routershare,
                    taskArgs.routernativeshare
                )
                .sendAndWait();
        } else {
            await (
                await c.setIntegratorFee(
                    taskArgs.integrator,
                    taskArgs.receiver,
                    taskArgs.fixednative,
                    taskArgs.tokenfeerate,
                    taskArgs.routershare,
                    taskArgs.routernativeshare
                )
            ).wait();
        }
        console.log("IntegratorManager setIntegratorFee done");
    });
