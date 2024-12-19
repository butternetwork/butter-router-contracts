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
        await deployReceiver("SolanaReceiver", hre.artifacts, network.name, config);
    } else {
        console.log("Receiver deployer :", deployer);

       await hre.run("solanaReceiver:deploy", { bridge: config.v3.bridge, wtoken: config.wToken });

        let deploy_json = await readFromFile(network.name);
        let router_addr = deploy_json[network.name]["SolanaReceiver"];

        deploy_json = await readFromFile(network.name);
        let adapt_addr = deploy_json[network.name]["SwapAdapterV3"];

        config.v3.executors.push(adapt_addr);

        let executors_s = config.v3.executors.join(",");

        await hre.run("solanaReceiver:setAuthorization", { receiver: router_addr, executors: executors_s });
    }
};

task("solanaReceiver:deploy", "deploy solana receiver")
    .addParam("bridge", "bridge address")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer:", deployer.address)
        let salt = process.env.SOLANA_RECEIVER_DEPLOY_SALT;
        let receiverAddr = await create(
            hre,
            deployer,
            "SolanaReceiver",
            ["address", "address", "address"],
            [deployer.address, taskArgs.wtoken, taskArgs.bridge],
            salt
        );
        console.log("Receiver address :", receiverAddr);

        let deployments = await readFromFile(hre.network.name);
        deployments[hre.network.name]["SolanaReceiver"] = receiverAddr;
        await writeToFile(deployments);
        await verify(
            hre,
            receiverAddr,
            [deployer.address, taskArgs.wtoken, taskArgs.bridge],
            "contracts/SolanaReceiver.sol:SolanaReceiver",
            true
        );
    });

task("solanaReceiver:setAuthorization", "set Authorization")
    .addParam("receiver", "receiver address")
    .addParam("executors", "executors address array")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];

        if (network.name === "Tron" || network.name === "TronTest") {
            await tronSetAuthorizationV3(
                hre.artifacts,
                network.name,
                taskArgs.receiver,
                taskArgs.executors,
                taskArgs.flag
            );
        } else {
            console.log("\nsetAuthorization deployer :", deployer.address);

            await setAuthorizationV3(taskArgs.receiver, taskArgs.executors, taskArgs.flag);
        }
    });


task("solanaReceiver:updateKeepers", "set setFee")
    .addOptionalParam("receiver", "receiver address", "receiver", types.string)
    .addParam("keeper", "receiver address")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("\n updateKeepers deployer :", deployer.address);
        let deploy_json = await readFromFile(network.name);
        let receiver_addr = taskArgs.receiver;
        if (receiver_addr === "receiver") {
            if (deploy_json[network.name]["SolanaReceiver"] === undefined) {
                throw "can not get Receiver address";
            }
            receiver_addr = deploy_json[network.name]["SolanaReceiver"];
        }
        console.log("Receiver: ", receiver_addr);

        let Receiver = await ethers.getContractFactory("SolanaReceiver");
        let receiver = Receiver.attach(receiver_addr);

        await (await receiver.updateKeepers(taskArgs.keeper, taskArgs.flag)).wait();
    });


task("solanaReceiver:update", "check and Update from config file")
    .addOptionalParam("receiver", "receiver address", "receiver", types.string)
    .setAction(async (taskArgs, hre) => {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }
        if (network.name === "Tron" || network.name === "TronTest") {
            await tronCheckAndUpdateFromConfig(hre.artifacts, network.name, taskArgs.receiver, config, false);
        } else {
            console.log("\nset Authorization from config file deployer :", deployer);
            let deploy_json = await readFromFile(network.name);
            let receiver_addr = taskArgs.receiver;
            if (receiver_addr === "receiver") {
                if (deploy_json[network.name]["SolanaReceiver"] === undefined) {
                    throw "can not get Receiver address";
                }
                receiver_addr = deploy_json[network.name]["SolanaReceiver"];
            }
            console.log("SolanaReceiver: ", receiver_addr);

            let Receiver = await ethers.getContractFactory("SolanaReceiver");
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

task("solanaReceiver:removeAuthFromConfig", "remove Authorization from config file")
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

            if (deploy_json[network.name]["SolanaReceiver"] === undefined) {
                throw "can not get receiver address";
            }
            receiver_addr = deploy_json[network.name]["SolanaReceiver"];
        }
        console.log("Receiver: ", receiver_addr);

        if (network.name === "Tron" || network.name === "TronTest") {
            await tronRemoveAuthFromConfig(hre.artifacts, hre.network.name, receiver_addr, config);
        } else {
            let Receiver = await ethers.getContractFactory("SolanaReceiver");
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
                await setAuthorizationV3(receiver_addr, removes_s, false);
            }
        }
        console.log("Receiver remove authorization from config file.");
    });

let SwapFailed_topic = "0xd457b25e0e458857e38c937f68af3100c40afd88fc5522c5820440d07b44351f";
task("solanaReceiver:execSwap", "execSwap")
        .addParam("hash", "transation hash")
        .addOptionalParam("force", "force execSwap, default: false", false, types.boolean)
        .setAction(async (taskArgs, hre) => {
            const { ethers, network } = hre;
            let [wallet] = await ethers.getSigners();
            console.log("wallet...", wallet.address);
            let deploy_json = await readFromFile(hre.network.name);
            let receiver_addr = deploy_json[network.name]["SolanaReceiver"];
            let chain_id = network.config.chainId;
            if (receiver_addr === undefined) {
                throw "can not get receiver address";
            }
            let Receiver = await ethers.getContractFactory("SolanaReceiver");
            let receiver = Receiver.attach(receiver_addr);
            receiver_addr = receiver_addr.toLowerCase();
            let r = await ethers.provider.getTransactionReceipt(taskArgs.hash);
            let swapFailed;
            if (r && r.logs) {
                r.logs.forEach((log) => {
                    if (log.address.toLowerCase() === receiver_addr && log.topics[0].toLowerCase() === SwapFailed_topic) {
                        swapFailed = log;
                    }
                });
            }
            if (swapFailed) {
                let url = process.env.BUTTER_ROUTER_API;
                let orderId = swapFailed.topics[1];
                let storeHash = await receiver.storedFailedSwap(orderId);
                if (storeHash === ethers.constants.HashZero) {
                    throw "already exec ?";
                }
                let decode = ethers.utils.defaultAbiCoder.decode(
                    ["uint256", "address", "address", "uint256", "address", "uint256", "bytes", "bytes"],
                    swapFailed.data
                );
                let tokenIn = decode[1];
                let dstToken = decode[2];
                let amount_decimals = decode[3];
                let user_addr = decode[4];
                let from = decode[6];
                let callBackData = decode[7];
                let slippage = 30
                let inTokenDecimals = await decimals(tokenIn, wallet);
                let amount = ethers.FixedNumber.from(amount_decimals).divUnsafe(
                    ethers.FixedNumber.from(ethers.BigNumber.from(10).pow(inTokenDecimals))
                );
    
                let minReceived = ethers.BigNumber.from(decode[5]);
                let get_param = `fromChainId=${chain_id}&toChainId=${chain_id}&amount=${amount}&tokenInAddress=${tokenIn}&tokenOutAddress=${dstToken}&type=exactIn&slippage=${slippage}&from=${wallet.address}&receiver=${user_addr}&callData=${callBackData}&entrance=Butter%2B`;
                let response = await httpGet(url, get_param);
    
                console.log(url + get_param)
                if(!response) {
                    throw "get swap router failed";
                }
                let j = JSON.parse(response);
                if (j.errno === 0) {
                    let txParam = j.data[0].txParam;
                    let router = j.data[0].route;
                    let index = router.minAmountOut.amount.indexOf(".");
                    let outTokenDecimals = await decimals(dstToken, wallet);
                    let minOut
                    if(index > 0){
                        let len = router.minAmountOut.amount.length - index - 1;
                        if(len > outTokenDecimals) len = outTokenDecimals;
                        minOut = ethers.utils.parseUnits(router.minAmountOut.amount.substring(0, (len + index + 1)), outTokenDecimals);  //add slippage 
                    } else {
                        minOut = ethers.utils.parseUnits(router.minAmountOut.amount, decimals);  //add slippage 
                    }
                    console.log("minOut ：", minOut)
                    console.log("event minOut ：", minReceived)
                    if(minReceived.gt(minOut) && (!taskArgs.force)){
                        throw "receiver too lower";
                    }
                    if (txParam.errno === 0 && txParam.data.length != 0) {
                        let args = txParam.data[0].args;
                        if (args && args.length != 0) {
                            console.log(args);
                            let gasLimit = await receiver.estimateGas.execSwap(
                                orderId,
                                decode[0],       // fromChain
                                tokenIn,
                                amount_decimals, // amount
                                from,            // from
                                args[4].value,   // swapData
                                callBackData,    // callBackData
                            );
                            if(gasLimit) {
                                await (
                                    await receiver.execSwap(
                                        orderId,
                                        decode[0],       // fromChain
                                        tokenIn,
                                        amount_decimals, // amount
                                        from,            // from
                                        args[4].value,   // swapData
                                        callBackData,    // callBackData
                                        { gasLimit: 1200000 }
                                    )
                                ).wait();
                            }
                        }
                    }
                } else {
                    console.log(j);
                }
            }
        });
    
    
    async function decimals(token,wallet) {
        let decimals;
        if (token.toLowerCase() === ethers.constants.AddressZero) {
            decimals = 18;
        } else {
            let ERC20 = ["function decimals() external view returns (uint8)"];
            let t = await ethers.getContractAt(ERC20, token, wallet);
            decimals = await t.decimals();
        }
        return decimals;
    }