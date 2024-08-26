let { create, readFromFile, writeToFile } = require("../../utils/create.js");
let { task } = require("hardhat/config");
let { getConfig } = require("../../configs/config");
let { setAuthorizationV3, setFeeV3, transferOwner, setBridge } = require("../utils/util.js");
let {
    tronSetAuthorizationV3,
    tronCheckAndUpdateFromConfig,
    tronRemoveAuthFromConfig,
    deployReceiver,
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
        await deployReceiver(hre.artifacts, network.name, config);
    } else {
        console.log("Receiver deployer :", deployer);

        await hre.run("receiver:deploy", { bridge: config.v3.bridge, wtoken: config.wToken });

        let deploy_json = await readFromFile(network.name);
        let router_addr = deploy_json[network.name]["Receiver"];

        deploy_json = await readFromFile(network.name);
        let adapt_addr = deploy_json[network.name]["SwapAdapterV3"];

        config.v3.executors.push(adapt_addr);

        let executors_s = config.v3.executors.join(",");

        await hre.run("receiver:setAuthorization", { router: router_addr, executors: executors_s });

    }
};

task("receiver:deploy", "deploy receiver")
    .addParam("bridge", "bridge address")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];

        let salt = process.env.RECEIVER_DEPLOY_SALT;
        let receiverAddr = await create(
            hre,
            deployer,
            "Receiver",
            ["address", "address", "address"],
            [deployer.address, taskArgs.wtoken, taskArgs.bridge],
            salt
        );
        console.log("Receiver address :", receiverAddr);

        let deployments = await readFromFile(hre.network.name);
        deployments[hre.network.name]["Receiver"] = receiverAddr;
        await writeToFile(deployments);

        await verify(
            hre,
            receiverAddr,
            [deployer.address, taskArgs.wtoken, taskArgs.bridge],
            "contracts/Receiver.sol:Receiver",
            true
        );
    });

task("receiver:setAuthorization", "set Authorization")
    .addParam("receiver", "receiver address")
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
                taskArgs.receiver,
                taskArgs.executors,
                taskArgs.flag
            );
        } else {
            console.log("\nsetAuthorization deployer :", deployer);

            await setAuthorizationV3(taskArgs.receiver, taskArgs.executors, taskArgs.flag);
        }
    });


task("receiver:setBridge", "set setFee")
    .addParam("receiver", "receiver address")
    .addParam("bridge", "bridge address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        if (network.name === "Tron" || network.name === "TronTest") {
          //  await tronSetFeeV3(hre.artifacts, network.name, taskArgs.router, taskArgs.bridge);
        } else {
            console.log("\nset bridge :", taskArgs.bridge);

            await setBridge(taskArgs.receiver, taskArgs.bridge);
        }
    });

task("receiver:setOwner", "transfer owner")
    .addParam("receiver", "receiver address")
    .addParam("owner", "owner address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        if (network.name === "Tron" || network.name === "TronTest") {

        } else {
            console.log("\ntransfer owner :", taskArgs.owner);
            await transferOwner(taskArgs.receiver, taskArgs.owner);
        }
    });


task("receiver:update", "check and Update from config file")
    .addOptionalParam("receiver", "receiver address", "receiver", types.string)
    .setAction(async (taskArgs, hre) => {
        const { getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }
        if (network.name === "Tron" || network.name === "TronTest") {
            await tronCheckAndUpdateFromConfig(hre.artifacts, network.name, taskArgs.receiver, config, false);
        } else {
            console.log("\nset Authorization from config file deployer :", deployer);
            let deploy_json = await readFromFile(network.name);
            receiver
            let receiver_addr = taskArgs.receiver;
            if (receiver_addr === "receiver") {
                if (deploy_json[network.name]["Receiver"] === undefined) {
                    throw "can not get Receiver address";
                }
                receiver_addr = deploy_json[network.name]["Receiver"];
            }
            console.log("Receiver: ", receiver_addr);

            let Receiver = await ethers.getContractFactory("Receiver");
            let receiver = Receiver.attach(receiver_addr);
            await checkAuthorization(receiver, config, deploy_json);
            await checkBridgeAndWToken(receiver, config);
            await hre.run("receiver:removeAuthFromConfig", { receiver: receiver_addr });
        }
    });

async function checkAuthorization(receiver, config, deploy_json) {
    let adapter_address = deploy_json[network.name]["SwapAdapterV3"];
    if (adapter_address != undefined) {
        console.log("SwapAdapter: ", adapter_address);
        config.v3.executors.push(adapter_address);
    }
    let executors = [];
    for (let i = 0; i < config.v3.executors.length; i++) {
        let result = await await receiver.approved(config.v3.executors[i]);

        if (result === false || result === undefined) {
            executors.push(config.v3.executors[i]);
        }
    }
    if (executors.length > 0) {
        let executors_s = executors.join(",");

        console.log("receiver to set :", executors_s);

        await setAuthorizationV3(receiver.address, executors_s, true);
    }

    console.log("receiver sync authorization from config file.");
}


async function checkBridgeAndWToken(router, config) {
    let wToken = await router.wToken();

    console.log("pre wToken", wToken);
    if (wToken.toLowerCase() !== config.wToken.toLowerCase()) {
        await (await router.setWToken(config.wToken)).wait();
        console.log("wToken", await router.wToken());
    }

    let bridgeAddress = await router.bridgeAddress();
    console.log("pre bridgeAddress", bridgeAddress);
    if (bridgeAddress.toLowerCase() !== config.v3.bridge.toLowerCase()) {
        await (await router.setBridgeAddress(config.v3.bridge)).wait();
        console.log("bridgeAddress", await router.bridgeAddress());
    }
}


task("receiver:removeAuthFromConfig", "remove Authorization from config file")
    .addOptionalParam("receiver", "receiver address", "receiver", types.string)
    .setAction(async (taskArgs, hre) => {
        const { ethers } = hre;
        let config = getConfig(hre.network.name);
        if (!config) {
            throw "config not set";
        }

        let receiver_addr = taskArgs.receiver;
        if (receiver_addr === "receiver") {
            let deploy_json = await readFromFile(hre.network.name);

            if (deploy_json[network.name]["Receiver"] === undefined) {
                throw "can not get receiver address";
            }
            receiver_addr = deploy_json[network.name]["Receiver"];
        }
        console.log("Receiver: ", receiver_addr);

        if (network.name === "Tron" || network.name === "TronTest") {
            await tronRemoveAuthFromConfig(hre.artifacts, hre.network.name, receiver_addr, config);
        } else {
            let Receiver = await ethers.getContractFactory("Receiver");
            let receiver = Receiver.attach(receiver_addr);
            let removes = [];
            for (let i = 0; i < config.removes.length; i++) {
                let result = await receiver.approved(config.removes[i]);
                if (result === true) {
                    removes.push(config.removes[i]);
                }
            }
            if (removes.length > 0) {
                let removes_s = removes.join(",");
                console.log("receiver to remove :", removes_s);
                await setAuthorization(receiver_addr, removes_s, false);
            }
        }
        console.log("Receiver remove authorization from config file.");
    });
