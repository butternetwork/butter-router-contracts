let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { task } = require("hardhat/config");
let { deployFeeManager, initialFeeStruct, setIntegratorFee } = require("../utils/tronFeeManager.js");
let { getFeeManagerConfig } = require("../../configs/FeeManagerConfig.js");

task("IntegratorManager:deploy", "deploy IntegratorManager").setAction(async (taskArgs, hre) => {
    const { getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    if (network.name === "Tron" || network.name === "TronTest") {
        await deployFeeManager(hre.artifacts, network.name);
    } else {
        console.log("deployer :", deployer);
        let chainId = hre.network.config.chainId;
        let feeManager;
        if (chainId === 324 || chainId === 280) {
            feeManager = await createZk("IntegratorManager", [deployer], hre);
        } else {
            let salt = process.env.FEE_MANAGER_SALT;
            let FeeManager = await ethers.getContractFactory("IntegratorManager");
            let param = ethers.utils.defaultAbiCoder.encode(["address"], [deployer]);
            let result = await create(salt, FeeManager.bytecode, param);
            feeManager = result[0];
        }
        console.log("IntegratorManager  address :", feeManager);
        let deploy = await readFromFile(network.name);
        deploy[network.name]["IntegratorManager"] = feeManager;
        await writeToFile(deploy);
        const verifyArgs = [deployer].map((arg) => (typeof arg == "string" ? `'${arg}'` : arg)).join(" ");
        console.log(`To verify, run: npx hardhat verify --network ${network.name} ${feeManager} ${verifyArgs}`);
        await hre.run("IntegratorManager:setRouterFeeFromConfig", {});
    }
});

task("IntegratorManager:setRouterFeeFromConfig", "setRouterFee feeManager").setAction(async (taskArgs, hre) => {
    const { getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
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
        const { getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();

        if (network.name === "Tron" || network.name === "TronTest") {
            await initialFeeStruct(
                hre.artifacts,
                network.name,
                taskArgs.receiver,
                taskArgs.fixednative,
                taskArgs.tokenfeerate,
                taskArgs.routershare,
                taskArgs.routernativeshare
            );
        } else {
            console.log("deployer :", deployer);
            let deploy = await readFromFile(network.name);
            if (!deploy[network.name]["IntegratorManager"]) {
                throw "feeManager not deploy";
            }
            console.log("feeManager  address :", deploy[network.name]["IntegratorManager"]);
            let FeeManager = await ethers.getContractFactory("IntegratorManager");
            let feeManager = FeeManager.attach(deploy[network.name]["IntegratorManager"]);
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
        const { getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        if (network.name === "Tron" || network.name === "TronTest") {
            await setIntegratorFee(
                hre.artifacts,
                network.name,
                taskArgs.integrator,
                taskArgs.receiver,
                taskArgs.fixednative,
                taskArgs.tokenfeerate,
                taskArgs.routershare,
                taskArgs.routernativeshare
            );
        } else {
            console.log("deployer :", deployer);
            let deploy = await readFromFile(network.name);
            if (!deploy[network.name]["IntegratorManager"]) {
                throw "feeManager not deploy";
            }
            console.log("feeManager  address :", deploy[network.name]["IntegratorManager"]);
            let FeeManager = await ethers.getContractFactory("IntegratorManager");
            let feeManager = FeeManager.attach(deploy[network.name]["IntegratorManager"]);

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
