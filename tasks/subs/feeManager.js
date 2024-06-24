let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { task } = require("hardhat/config");
let { deployFeeManager, initialFeeStruct, setIntegratorFee } = require("../utils/tronFeeManager.js");
let { getFeeManagerConfig } = require("../../configs/FeeManagerConfig.js");

task("feeManager:deploy", "deploy feeManager").setAction(async (taskArgs, hre) => {
    const { getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    if (network.name === "Tron" || network.name === "TronTest") {
        await deployFeeManager(hre.artifacts, network.name);
    } else {
        console.log("deployer :", deployer);
        let chainId = hre.network.config.chainId;
        let feeManager;
        if (chainId === 324 || chainId === 280) {
            feeManager = await createZk("FeeManager", [deployer], hre);
        } else {
            let salt = process.env.FEE_MANAGER_SALT;
            let FeeManager = await ethers.getContractFactory("FeeManager");
            let param = ethers.utils.defaultAbiCoder.encode(["address"], [deployer]);
            let result = await create(salt, FeeManager.bytecode, param);
            feeManager = result[0];
        }
        console.log("feeManager  address :", feeManager);
        let deploy = await readFromFile(network.name);
        deploy[network.name]["FeeManager"] = feeManager;
        await writeToFile(deploy);
        const verifyArgs = [deployer].map((arg) => (typeof arg == "string" ? `'${arg}'` : arg)).join(" ");
        console.log(`To verify, run: npx hardhat verify --network ${network.name} ${feeManager} ${verifyArgs}`);
        await hre.run("feeManager:setRouterFeeFromConfig", {});
    }
});

task("feeManager:setRouterFeeFromConfig", "setRouterFee feeManager").setAction(async (taskArgs, hre) => {
    const { getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    let feeManagerConfig = getFeeManagerConfig(network.name);
    if (feeManagerConfig) {
        await hre.run("feeManager:setRouterFee", {
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

task("feeManager:setRouterFee", "initialFeeStruct feeManager")
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
            if (!deploy[network.name]["FeeManager"]) {
                throw "feeManager not deploy";
            }
            console.log("feeManager  address :", deploy[network.name]["FeeManager"]);
            let FeeManager = await ethers.getContractFactory("FeeManager");
            let feeManager = FeeManager.attach(deploy[network.name]["FeeManager"]);
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

task("feeManager:setIntegratorFee", "setIntegratorFees feeManager")
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
            if (!deploy[network.name]["FeeManager"]) {
                throw "feeManager not deploy";
            }
            console.log("feeManager  address :", deploy[network.name]["FeeManager"]);
            let FeeManager = await ethers.getContractFactory("FeeManager");
            let feeManager = FeeManager.attach(deploy[network.name]["FeeManager"]);

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
