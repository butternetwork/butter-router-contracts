let { create, getTronContract, getTronDeployer } = require("../../utils/create.js");
let { getDeployment, saveDeployment, tronAddressToHex } = require("../../utils/helper.js");
let { getConfig } = require("../../configs/config");
let {
    setAuthorization,
    setBridge,
    setOwner,
    getExecutorList,
    checkAuthorization,
    checkBridgeAndWToken,
    removeAuthFromConfig,
} = require("../common/common.js");
let { verify } = require("../../utils/verify.js");
let { httpGet } = require("../../utils/httpUtil.js");
const {hexToTronAddress} = require("../../utils/helper");

async function getReceiverAddress(receiver, network) {
    if (!receiver || receiver === "") {
        receiver = await getDeployment(network, "Receiver");
        if(!receiver) receiver = await getDeployment(network, "ReceiverV2");
    }
    if (receiver === undefined) {
        throw "can not get receiver address";
    }
    return receiver;
}

module.exports = async (taskArgs, hre) => {
    const { network } = hre;
    let config = getConfig(network.name);
    if (!config) {
        throw "config not set";
    }
    await hre.run("receiver:deploy", { bridge: config.v3.bridge, wtoken: config.wToken });
    let receiver_addr = await getReceiverAddress("",network.name);
    let adapt_addr = await getDeployment(network.name, "SwapAdapterV3");
    config.v3.executors.push(adapt_addr);
    let executors_s = config.v3.executors.join(",");
    await hre.run("receiver:setAuthorization", { receiver: receiver_addr, executors: executors_s });
};

task("receiver:deploy", "deploy receiver")
    .addParam("bridge", "bridge address")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
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
        let salt = process.env.RECEIVER_DEPLOY_SALT;
        let receiverAddr = await create(
            hre,
            deployer,
            "Receiver",
            ["address", "address", "address"],
            [deployer_address, wtoken, bridge],
            salt
        );
        console.log("Receiver address :", receiverAddr);
        await saveDeployment(network.name, "Receiver", receiverAddr);
        await verify(
            receiverAddr,
            [deployer_address, wtoken, bridge],
            "contracts/Receiver.sol:Receiver",
            network.config.chainId,
            true
        );
    });

task("receiver:setAuthorization", "set Authorization")
    .addOptionalParam("receiver", "receiver address", "", types.string)
    .addParam("executors", "executors address array")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, network.name);
        let list = await getExecutorList(network.name, taskArgs.executors);
        await setAuthorization("Receiver", hre.artifacts, network.name, receiver_addr, list, taskArgs.flag);
    });

task("receiver:setBridge", "set setFee")
    .addOptionalParam("receiver", "receiver address", "", types.string)
    .addParam("bridge", "bridge address")
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, network.name);
        await setBridge("Receiver", hre.artifacts, network.name, receiver_addr, taskArgs.bridge);
    });

task("receiver:updateKeepers", "set setFee")
    .addOptionalParam("receiver", "receiver address", "", types.string)
    .addParam("keeper", "keeper address")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, network.name);
        console.log("Receiver: ", receiver_addr);
        console.log("keeper: ", taskArgs.keeper);
        if (hre.network.name === "Tron" || hre.network.name === "TronTest") {
            console.log("deployer :", await getTronDeployer(false, network.name));
            let receiver = await getTronContract("Receiver", hre.artifacts, network.name, receiver_addr);
            await receiver.updateKeepers(tronAddressToHex(taskArgs.keeper), taskArgs.flag).send();
        } else {
            console.log("\n updateKeepers deployer :", deployer.address);
            let Receiver = await ethers.getContractFactory("Receiver");
            let receiver = Receiver.attach(receiver_addr);
            await (await receiver.updateKeepers(taskArgs.keeper, taskArgs.flag)).wait();
        }
    });

task("receiver:setOwner", "transfer owner")
    .addOptionalParam("receiver", "receiver address", "", types.string)
    .addParam("owner", "owner address")
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, network.name);
        await setOwner("Receiver", hre.artifacts, network.name, receiver_addr, taskArgs.owner);
    });

task("receiver:update", "check and Update from config file")
    .addOptionalParam("receiver", "receiver address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, network.name);
        console.log("Receiver: ", receiver_addr);
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }
        await checkAuthorization("Receiver", hre.artifacts, network.name, receiver_addr, config.v3.executors);
        //await checkBridgeAndWToken("Receiver", hre.artifacts, network.name, receiver_addr, config);
        //await hre.run("receiver:removeAuthFromConfig", { receiver: receiver_addr });
    });

task("receiver:removeAuthFromConfig", "remove Authorization from config file")
    .addOptionalParam("receiver", "receiver address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer: ", deployer.address);
        let config = getConfig(hre.network.name);
        if (!config) {
            throw "config not set";
        }
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, network.name);
        console.log("Receiver: ", receiver_addr);
        if (!config.removes || config.removes.length === 0) {
            console.log("no removes list");
            return;
        }
        await removeAuthFromConfig("Receiver", hre.artifacts, network.name, receiver_addr, config.removes);
        console.log("Receiver remove authorization from config file.");
    });

// event SwapFailed(
//     bytes32 indexed _orderId,
//     uint256 _fromChain,
//     address _srcToken,
//     address _dscToken,
//     uint256 _amount,
//     address _receiver,
//     uint256 _minReceived,
//     bytes _from,
//     bytes _callData
// );
let SwapFailed_topic = "0xd457b25e0e458857e38c937f68af3100c40afd88fc5522c5820440d07b44351f";
task("receiver:execSwap", "execSwap")
    .addOptionalParam("receiver", "receiver address", "", types.string)
    .addParam("hash", "transaction hash")
    .addOptionalParam("force", "force execSwap, default: false", false, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;
        let [wallet] = await ethers.getSigners();
        console.log("wallet...", wallet.address);
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, network.name);
        let chain_id = network.config.chainId;
        console.log("Receiver: ", receiver_addr);
        let receiver;
        let receiverHex;
        if (network.name === "Tron" || network.name === "TronTest") {
            receiver = await getTronContract("Receiver", hre.artifacts, network.name, receiver_addr);
            receiverHex = tronAddressToHex(receiver_addr);
            let keeper = await receiver.keepers(wallet.address).call();
            console.log("wallet is keeper: ", keeper);
        } else {
            let Receiver = await ethers.getContractFactory("Receiver");
            receiver = await Receiver.attach(receiver_addr);
            receiverHex = receiver_addr.toLowerCase();
        }

        let r = await ethers.provider.getTransactionReceipt(taskArgs.hash);
        let swapFailed;
        if (r && r.logs) {
            r.logs.forEach((log) => {
                if (log.address.toLowerCase() === receiverHex && log.topics[0].toLowerCase() === SwapFailed_topic) {
                    swapFailed = log;
                }
            });
        }
        if (swapFailed) {
            let url = process.env.BUTTER_ROUTER_API;
            let orderId = swapFailed.topics[1];

            let storeHash;
            if (network.name === "Tron" || network.name === "TronTest") {
                storeHash = await receiver.storedFailedSwap(orderId).call();
            } else {
                storeHash = await receiver.storedFailedSwap(orderId);
            }
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
            let req_from = receiver_addr;
            let callBackData = decode[7];
            let slippage = 30;
            let inTokenDecimals = await decimals(tokenIn, wallet);
            // console.log(inTokenDecimals);
            /*
            let amount = ethers.FixedNumber.from(amount_decimals).divUnsafe(
                ethers.FixedNumber.from(ethers.BigNumber.from(10).pow(inTokenDecimals))
            );*/
            let amount = ethers.utils.formatUnits(amount_decimals, inTokenDecimals);

            console.log("tokenIn ：", tokenIn);
            console.log("dstToken ：", dstToken);
            console.log("amount ：", amount);

            let minReceived = ethers.BigNumber.from(decode[5]);
            let get_param = `fromChainId=${chain_id}&toChainId=${chain_id}&amount=${amount}&tokenInAddress=${tokenIn}&tokenOutAddress=${dstToken}&type=exactIn&slippage=${slippage}&from=${req_from}&receiver=${user_addr}&callData=${callBackData}&entrance=Butter%2B&swapCaller=${receiver_addr}`;
            console.log(get_param);
            let response = await httpGet(url, get_param);
            if (!response) {
                throw "get swap router failed";
            }
            let j = JSON.parse(response);
            if (j.errno === 0) {
                console.log(orderId);
                console.log(decode[0]); // fromChain
                console.log(tokenIn);
                console.log(amount_decimals); // amount
                console.log(from); // from
                console.log(callBackData); // callBackData

                let txParam = j.data[0].txParam;
                let router = j.data[0].route;

                let index = router.minAmountOut.amount.indexOf(".");
                let outTokenDecimals = await decimals(dstToken, wallet);
                let minOut;
                if (index > 0) {
                    let len = router.minAmountOut.amount.length - index - 1;
                    if (len > outTokenDecimals) len = outTokenDecimals;
                    minOut = ethers.utils.parseUnits(
                        router.minAmountOut.amount.substring(0, len + index + 1),
                        outTokenDecimals
                    ); //add slippage
                } else {
                    minOut = ethers.utils.parseUnits(router.minAmountOut.amount, decimals); //add slippage
                }
                console.log("minOut ：", minOut);
                console.log("event minOut ：", minReceived);
                if (minReceived.gt(minOut) && !taskArgs.force) {
                    throw "receiver too lower";
                }
                if (txParam.errno === 0 && txParam.data.length != 0) {
                    let args = txParam.data[0].args;
                    if (args && args.length != 0) {
                        console.log(args);

                        if (hre.network.name === "Tron" || hre.network.name === "TronTest") {
                            await receiver
                                .execSwap(
                                    orderId,
                                    decode[0], // fromChain
                                    tokenIn,
                                    amount_decimals, // amount
                                    from, // from
                                    args[4].value, // swapData
                                    callBackData // callBackData
                                )
                                .send();
                            return;
                        }

                        let gasLimit = await receiver.estimateGas.execSwap(
                            orderId,
                            decode[0], // fromChain
                            tokenIn,
                            amount_decimals, // amount
                            from, // from
                            args[4].value, // swapData
                            callBackData // callBackData
                        );
                        console.log(gasLimit);

                        if (gasLimit) {
                            await (
                                await receiver.execSwap(
                                    orderId,
                                    decode[0], // fromChain
                                    tokenIn,
                                    amount_decimals, // amount
                                    from, // from
                                    args[4].value, // swapData
                                    callBackData, // callBackData
                                    { gasLimit: 5000000 }
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

task("receiver:swapRescueFunds", "swapRescueFunds")
    .addOptionalParam("receiver", "receiver address", "", types.string)
    .addParam("hash", "transation hash")
    .addOptionalParam("force", "force execSwap, default: false", false, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;
        let [wallet] = await ethers.getSigners();
        console.log("wallet...", wallet.address);
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, network.name);
        console.log("Receiver: ", receiver_addr);
        let receiver;
        let receiverHex;
        if (network.name === "Tron" || network.name === "TronTest") {
            receiver = await getTronContract("Receiver", hre.artifacts, network.name, receiver_addr);
            receiverHex = tronAddressToHex(receiver_addr);
            let keeper = await receiver.keepers(wallet.address).call();
            console.log("wallet is keeper: ", keeper);
        } else {
            let Receiver = await ethers.getContractFactory("Receiver");
            receiver = await Receiver.attach(receiver_addr);
            receiverHex = receiver_addr.toLowerCase();
        }

        let r = await ethers.provider.getTransactionReceipt(taskArgs.hash);
        let swapFailed;
        if (r && r.logs) {
            r.logs.forEach((log) => {
                if (log.address.toLowerCase() === receiverHex && log.topics[0].toLowerCase() === SwapFailed_topic) {
                    swapFailed = log;
                }
            });
        }
        if (swapFailed) {
            let orderId = swapFailed.topics[1];
            let storeHash;
            if (network.name === "Tron" || network.name === "TronTest") {
                storeHash = await receiver.storedFailedSwap(orderId).call();
            } else {
                storeHash = await receiver.storedFailedSwap(orderId);
            }
            if (storeHash === ethers.constants.HashZero) {
                throw "already exec ?";
            }
            let decode = ethers.utils.defaultAbiCoder.decode(
                ["uint256", "address", "address", "uint256", "address", "uint256", "bytes", "bytes"],
                swapFailed.data
            );
            console.log(decode);

            let fromChain = decode[0];
            let tokenIn = decode[1];
            let dstToken = decode[2];
            let amount = decode[3];
            let user_addr = decode[4];
            let from = decode[6];
            let callBackData = decode[7];
            if (hre.network.name === "Tron" || hre.network.name === "TronTest") {
                await receiver
                    .swapRescueFunds(orderId, fromChain, tokenIn, amount, dstToken, user_addr, from, callBackData)
                    .send();
            } else {
                await (
                    await receiver.swapRescueFunds(
                        orderId,
                        fromChain,
                        tokenIn,
                        amount,
                        dstToken,
                        user_addr,
                        from,
                        callBackData
                    )
                ).wait();
            }
        }
    });

async function decimals(token, wallet) {
    let decimals;

    if (hre.network.name === "Tron" || hre.network.name === "TronTest") {
        if (token.toLowerCase() === ethers.constants.AddressZero) {
            // TRX
            decimals = 6;
        } else {
            let tokenAddr = hexToTronAddress(token);
            let t = await getTronContract("MockToken", hre.artifacts, hre.network.name, tokenAddr);
            decimals = await t.decimals().call();
        }
    } else {
        if (token.toLowerCase() === ethers.constants.AddressZero) {
            decimals = 18;
        } else {
            let ERC20 = ["function decimals() external view returns (uint8)"];
            let t = await ethers.getContractAt(ERC20, token, wallet);
            decimals = await t.decimals();
        }
    }

    return decimals;
}
