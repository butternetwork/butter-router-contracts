let { task } = require("hardhat/config");
let { create, getTronContract, getTronDeployer} = require("../../utils/create.js");
let { getDeployment, saveDeployment, tronAddressToHex } = require("../../utils/helper.js")
let { getFeeManagerConfig } = require("../../configs/FeeManagerConfig.js");

task("IntegratorManager:deploy", "deploy IntegratorManager").setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    let salt = process.env.FEE_MANAGER_SALT;
    let deployer_address
    if(network.name === "Tron" || network.name === "TronTest"){
        deployer_address = await getTronDeployer(true, network.name);
    } else {
        deployer_address = deployer.address
    }
    let integratorManager = await create(hre, deployer, "IntegratorManager", ["address"], [deployer_address], salt);
    console.log("IntegratorManager address :", integratorManager);
    await saveDeployment(network.name, "IntegratorManager", integratorManager);
    await verify(integratorManager, [deployer.address], "contracts/IntegratorManager.sol:IntegratorManager", network.config.chainId, true);
    await hre.run("IntegratorManager:setRouterFeeFromConfig", {});
});

task("IntegratorManager:setRouterFeeFromConfig", "setRouterFee feeManager").setAction(async (taskArgs, hre) => {
    
    let feeManagerConfig = getFeeManagerConfig(network.name);
    if (feeManagerConfig) {
        await hre.run("IntegratorManager:setRouterFee", {
            receiver: feeManagerConfig.receiver,
            fixednative: feeManagerConfig.fixedNative,
            tokenfeerate: feeManagerConfig.tokenFeeRate,
            routershare: feeManagerConfig.routerShare,
            routernativeshare: feeManagerConfig.routerNativeShare,
        });
    } else {
        throw "set feeManager config first";
    }
});

task("IntegratorManager:setRouterFee", "initialFeeStruct feeManager")
    .addParam("receiver", "fee receiver")
    .addParam("fixednative", "fixedNative")
    .addParam("tokenfeerate", "tokenFeeRate")
    .addParam("routershare", "openliq share of toekn fee")
    .addParam("routernativeshare", "openliq share of native fee")
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let addr = getDeployment(network.name, "IntegratorManager");
        if(!addr) throw "IntegratorManager not deploy"
        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer :", await getTronDeployer(false, network.name));
            let c = await getTronContract("IntegratorManager", hre.artifacts, network.name, addr)
            await c.setRouterFee(
                tronAddressToHex(taskArgs.receiver),
                taskArgs.fixednative,
                taskArgs.tokenfeerate,
                taskArgs.routershare,
                taskArgs.routernativeshare
            ).send()
        } else {
            console.log("deployer :", deployer.address);
            let FeeManager = await ethers.getContractFactory("IntegratorManager");
            let feeManager = FeeManager.attach(addr);
            await (
                await feeManager.setRouterFee(
                    taskArgs.receiver,
                    taskArgs.fixednative,
                    taskArgs.tokenfeerate,
                    taskArgs.routershare,
                    taskArgs.routernativeshare
                )
            ).wait();
        }
    });

task("IntegratorManager:setIntegratorFee", "setIntegratorFees feeManager")
    .addParam("integrator", "integrator")
    .addParam("receiver", "openliq fee Receiver")
    .addParam("fixednative", "fixedNative")
    .addParam("tokenfeerate", "tokenFeeRate")
    .addParam("routershare", "share")
    .addParam("routernativeshare", "openliq share of native fee")
    .setAction(async (taskArgs, hre) => {
        const { ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let addr = getDeployment(network.name, "IntegratorManager");
        if(!addr) throw "IntegratorManager not deploy"
        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer :", await getTronDeployer(false, network.name));
            let c = await getTronContract("IntegratorManager", hre.artifacts, network.name, addr)
            await c.setIntegratorFee(
                tronAddressToHex(taskArgs.integrator),
                tronAddressToHex(taskArgs.receiver),
                taskArgs.fixednative,
                taskArgs.tokenfeerate,
                taskArgs.routershare,
                taskArgs.routernativeshare
            ).send()
        } else {
            console.log("deployer :", deployer.address);
            let FeeManager = await ethers.getContractFactory("IntegratorManager");
            let feeManager = FeeManager.attach(addr);
            await (
                await feeManager.setIntegratorFee(
                    taskArgs.integrator,
                    taskArgs.receiver,
                    taskArgs.fixednative,
                    taskArgs.tokenfeerate,
                    taskArgs.routershare,
                    taskArgs.routernativeshare
                )
            ).wait();
        }
    });
