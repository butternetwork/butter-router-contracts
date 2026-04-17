const { getConfig } = require("../../configs/config");
const {
    getBridge, getDeploy, saveDeploy,
    getContract, getDeployerAddr, isTronNetwork, tronToHex, tronFromHex,
    createDeployer,
} = require("../utils/helper.js");
const { httpGet } = require("../utils/httpUtil.js");

const CONTRACT = "ReceiverV2";

async function getReceiverAddress(receiver, hre) {
    if (receiver && receiver !== "") return receiver;
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

    console.log("deploy ReceiverV2 with bridge:", bridge);
    await hre.run("receiverV2:deploy", { bridge, wtoken: config.wToken });

    let receiver_addr = await getReceiverAddress("", hre);
    let adapt_addr = await getDeploy(network.name, "SwapAdapterV3", "prod");
    config.v3.executors.push(adapt_addr);
    let executors_s = config.v3.executors.join(",");
    await hre.run("receiverV2:setAuthorization", { receiver: receiver_addr, executors: executors_s });
};

// ============================================================
// Deploy
// ============================================================
task("receiverV2:deploy", "Deploy ReceiverV2 contract")
    .addParam("bridge", "Bridge address")
    .addParam("wtoken", "Wrapped token address")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let deployer = createDeployer(hre, { autoVerify: true });
        let deployerAddr = await getDeployerAddr(hre);

        if (isTronNetwork(network.name)) {
            let bridge = tronToHex(taskArgs.bridge);
            let wtoken = tronToHex(taskArgs.wtoken);
            let result = await deployer.deploy(CONTRACT, [deployerAddr, wtoken, bridge]);
            console.log(`${CONTRACT} address: ${result.address}`);
            await saveDeploy(network.name, CONTRACT, result.address);
        } else {
            let salt = process.env.RECEIVER_V2_DEPLOY_SALT || "";
            let result = await deployer.deploy(CONTRACT, [deployerAddr, taskArgs.wtoken, taskArgs.bridge], salt);
            console.log(`${CONTRACT} address: ${result.address}`);
            await saveDeploy(network.name, CONTRACT, result.address);
        }
    });

// ============================================================
// Configuration tasks
// ============================================================
task("receiverV2:setAuthorization", "Set executor authorization")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addParam("executors", "Comma-separated executor addresses")
    .addOptionalParam("flag", "Authorization flag", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre);
        let c = await getContract(CONTRACT, hre, receiver_addr);

        if (isTronNetwork(hre.network.name)) {
            let list = taskArgs.executors.split(",").map(e => tronToHex(e.trim()));
            let toUpdate = [];
            for (let addr of list) {
                let approved = await c.approved(addr).call();
                if (Boolean(approved) !== taskArgs.flag) toUpdate.push(addr);
            }
            if (toUpdate.length === 0) {
                console.log(`${CONTRACT} ${receiver_addr} authorization already up-to-date`);
                return;
            }
            await c.setAuthorization(toUpdate, taskArgs.flag).sendAndWait();
            console.log(`${CONTRACT} ${receiver_addr} setAuthorization [${toUpdate.length}/${list.length} changed]`);
        } else {
            let list = taskArgs.executors.split(",").map(e => e.trim());
            let toUpdate = [];
            for (let addr of list) {
                let approved = await c.approved(addr);
                if (Boolean(approved) !== taskArgs.flag) toUpdate.push(addr);
            }
            if (toUpdate.length === 0) {
                console.log(`${CONTRACT} ${receiver_addr} authorization already up-to-date`);
                return;
            }
            await (await c.setAuthorization(toUpdate, taskArgs.flag)).wait();
            console.log(`${CONTRACT} ${receiver_addr} setAuthorization [${toUpdate.length}/${list.length} changed]`);
        }
    });

task("receiverV2:setBridge", "Set bridge address")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addParam("bridge", "Bridge address")
    .setAction(async (taskArgs, hre) => {
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre);
        let c = await getContract(CONTRACT, hre, receiver_addr);

        if (isTronNetwork(hre.network.name)) {
            let bridge = tronToHex(taskArgs.bridge);
            let current = tronToHex(await c.bridgeAddress().call());
            if (current.toLowerCase() === bridge.toLowerCase()) {
                console.log(`${CONTRACT} ${receiver_addr} bridge already set`);
                return;
            }
            await c.setBridgeAddress(bridge).sendAndWait();
            console.log(`${CONTRACT} ${receiver_addr} setBridgeAddress ${taskArgs.bridge}`);
        } else {
            let current = await c.bridgeAddress();
            if (current.toLowerCase() === taskArgs.bridge.toLowerCase()) {
                console.log(`${CONTRACT} ${receiver_addr} bridge already set`);
                return;
            }
            await (await c.setBridgeAddress(taskArgs.bridge)).wait();
            console.log(`${CONTRACT} ${receiver_addr} setBridgeAddress ${taskArgs.bridge}`);
        }
    });

task("receiverV2:updateKeepers", "Update keeper authorization (comma-separated)")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addParam("keepers", "Keeper addresses (comma-separated)")
    .addOptionalParam("flag", "Authorization flag", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre);
        let c = await getContract(CONTRACT, hre, receiver_addr);
        let list = taskArgs.keepers.split(",").map(e => e.trim());

        for (let keeper of list) {
            if (isTronNetwork(hre.network.name)) {
                await c.updateKeepers(tronToHex(keeper), taskArgs.flag).sendAndWait();
            } else {
                await (await c.updateKeepers(keeper, taskArgs.flag)).wait();
            }
            console.log(`${CONTRACT} ${receiver_addr} updateKeepers ${keeper} flag ${taskArgs.flag}`);
        }
    });

task("receiverV2:setOwner", "Transfer ownership")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addParam("owner", "New owner address")
    .setAction(async (taskArgs, hre) => {
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre);
        let c = await getContract(CONTRACT, hre, receiver_addr);

        if (isTronNetwork(hre.network.name)) {
            let owner = tronToHex(taskArgs.owner);
            let current = tronToHex(await c.owner().call());
            if (current.toLowerCase() === owner.toLowerCase()) {
                console.log(`${CONTRACT} ${receiver_addr} owner already ${taskArgs.owner}`);
                return;
            }
            await c.transferOwnership(owner).sendAndWait();
        } else {
            let current = await c.owner();
            if (current.toLowerCase() === taskArgs.owner.toLowerCase()) {
                console.log(`${CONTRACT} ${receiver_addr} owner already ${taskArgs.owner}`);
                return;
            }
            await (await c.transferOwnership(taskArgs.owner)).wait();
        }
        console.log(`${CONTRACT} ${receiver_addr} transferOwnership ${taskArgs.owner}`);
    });

// ============================================================
// Update (delegates to individual tasks which compare before send)
// ============================================================
task("receiverV2:update", "Check and update from config file")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre);
        let config = getConfig(hre.network.name);
        if (!config) throw "config not set";

        let adapt_addr;
        try { adapt_addr = await getDeploy(hre.network.name, "SwapAdapterV3", "prod"); } catch (e) {}
        let executors = [...config.v3.executors];
        if (adapt_addr) executors.push(adapt_addr);

        await hre.run("receiverV2:setAuthorization", { receiver: receiver_addr, executors: executors.join(",") });
        await hre.run("receiverV2:removeAuthFromConfig", { receiver: receiver_addr });
        console.log("ReceiverV2 update completed.");
    });

task("receiverV2:removeAuthFromConfig", "Remove authorization from config")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre);
        let config = getConfig(hre.network.name);
        if (!config) throw "config not set";
        if (!config.removes || config.removes.length === 0) {
            console.log("no removes list");
            return;
        }

        let c = await getContract(CONTRACT, hre, receiver_addr);
        let toRemove = [];

        if (isTronNetwork(hre.network.name)) {
            for (let exec of config.removes) {
                let addr = tronToHex(exec);
                if (await c.approved(addr).call()) toRemove.push(addr);
            }
            if (toRemove.length > 0) {
                await c.setAuthorization(toRemove, false).sendAndWait();
            }
        } else {
            for (let exec of config.removes) {
                if (await c.approved(exec)) toRemove.push(exec);
            }
            if (toRemove.length > 0) {
                await (await c.setAuthorization(toRemove, false)).wait();
            }
        }
        console.log(`ReceiverV2 removed ${toRemove.length} authorizations.`);
    });

// ============================================================
// Swap recovery tasks
// ============================================================
const SwapFailed_topic = "0xd457b25e0e458857e38c937f68af3100c40afd88fc5522c5820440d07b44351f";

async function getSwapFailedEvent(hre, txHash, receiver_addr) {
    const { ethers } = hre;
    let receiverHex = tronToHex(receiver_addr).toLowerCase();
    let r = await ethers.provider.getTransactionReceipt(txHash);
    if (!r || !r.logs) throw "Transaction receipt not found";

    let swapFailed;
    for (let log of r.logs) {
        if (log.address.toLowerCase() === receiverHex && log.topics[0].toLowerCase() === SwapFailed_topic) {
            swapFailed = log;
            break;
        }
    }
    if (!swapFailed) throw "No SwapFailed event found in this transaction";

    let orderId = swapFailed.topics[1];
    let decode = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "address", "address", "uint256", "address", "uint256", "bytes", "bytes"],
        swapFailed.data
    );
    // decode: [fromChain, tokenIn, dstToken, amount, receiver, minReceived, from, callBackData]
    return { orderId, decode };
}

async function checkNotExecuted(hre, contract, orderId) {
    const { ethers } = hre;
    let storeHash = isTronNetwork(hre.network.name)
        ? await contract.storedFailedSwap(orderId).call()
        : await contract.storedFailedSwap(orderId);
    if (storeHash === ethers.ZeroHash) throw "Already executed";
}

task("receiverV2:execSwap", "Execute failed swap")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addParam("hash", "Transaction hash")
    .addOptionalParam("slippage", "Slippage tolerance (default 30)", "30", types.string)
    .addOptionalParam("force", "Force execSwap even if minOut is lower", false, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;
        let [wallet] = await ethers.getSigners();
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre);
        let c = await getContract(CONTRACT, hre, receiver_addr);

        let { orderId, decode } = await getSwapFailedEvent(hre, taskArgs.hash, receiver_addr);
        await checkNotExecuted(hre, c, orderId);

        let tokenIn = decode[1];
        let dstToken = decode[2];
        let amount_decimals = decode[3];
        let minReceived = decode[5];
        let from = decode[6];
        let callBackData = decode[7];

        let inTokenDecimals = await getDecimals(hre, tokenIn, wallet);
        let amount = ethers.formatUnits(amount_decimals, inTokenDecimals);
        console.log("orderId:", orderId);
        console.log("tokenIn:", tokenIn, "dstToken:", dstToken, "amount:", amount);

        // Fetch swap route from Butter Router API
        let url = process.env.BUTTER_ROUTER_API;
        if (!url) throw "BUTTER_ROUTER_API not set in .env";
        let slippage = taskArgs.slippage;
        let chain_id = network.config.chainId;
        let get_param = `fromChainId=${chain_id}&toChainId=${chain_id}&amount=${amount}&tokenInAddress=${tokenIn}&tokenOutAddress=${dstToken}&type=exactIn&slippage=${slippage}&from=${receiver_addr}&receiver=${decode[4]}&callData=${callBackData}&entrance=Butter%2B&swapCaller=${receiver_addr}`;
        let response = await httpGet(url, get_param);
        if (!response) throw "Get swap route failed";

        let j = JSON.parse(response);
        if (j.errno !== 0) {
            console.log("API error:", j);
            return;
        }

        let txParam = j.data[0].txParam;
        let route = j.data[0].route;

        // Check minOut against event minReceived
        let outTokenDecimals = await getDecimals(hre, dstToken, wallet);
        let minOutStr = route.minAmountOut.amount;
        let dotIdx = minOutStr.indexOf(".");
        let minOut;
        if (dotIdx > 0) {
            let len = Math.min(minOutStr.length - dotIdx - 1, outTokenDecimals);
            minOut = ethers.parseUnits(minOutStr.substring(0, len + dotIdx + 1), outTokenDecimals);
        } else {
            minOut = ethers.parseUnits(minOutStr, outTokenDecimals);
        }
        console.log("route minOut:", minOut, "event minReceived:", minReceived);
        if (minReceived > minOut && !taskArgs.force) {
            throw `minOut too low (${minOut} < ${minReceived}), use --force to override`;
        }

        if (txParam.errno !== 0 || txParam.data.length === 0) {
            console.log("No valid swap data from API");
            return;
        }
        let swapData = txParam.data[0].args?.[4]?.value;
        if (!swapData) {
            console.log("No swap data in API response");
            return;
        }

        if (isTronNetwork(network.name)) {
            await c.execSwap(orderId, decode[0], tokenIn, amount_decimals, from, swapData, callBackData).sendAndWait();
        } else {
            await (await c.execSwap(orderId, decode[0], tokenIn, amount_decimals, from, swapData, callBackData, { gasLimit: 5000000 })).wait();
        }
        console.log("execSwap succeeded");
    });

task("receiverV2:swapRescueFunds", "Rescue funds from failed swap (send token directly to user)")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addParam("hash", "Transaction hash")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre);
        let c = await getContract(CONTRACT, hre, receiver_addr);

        let { orderId, decode } = await getSwapFailedEvent(hre, taskArgs.hash, receiver_addr);
        await checkNotExecuted(hre, c, orderId);

        console.log("orderId:", orderId);
        console.log("tokenIn:", decode[1], "amount:", decode[3].toString(), "user:", decode[4]);

        // swapRescueFunds(orderId, fromChain, tokenIn, amount, dstToken, user, from, callBackData)
        if (isTronNetwork(network.name)) {
            await c.swapRescueFunds(orderId, decode[0], decode[1], decode[3], decode[2], decode[4], decode[6], decode[7]).sendAndWait();
        } else {
            await (await c.swapRescueFunds(orderId, decode[0], decode[1], decode[3], decode[2], decode[4], decode[6], decode[7])).wait();
        }
        console.log("swapRescueFunds succeeded");
    });

// ============================================================
// Helpers
// ============================================================
async function getDecimals(hre, token, wallet) {
    const { ethers } = hre;
    if (token.toLowerCase() === ethers.ZeroAddress) {
        return isTronNetwork(hre.network.name) ? 6 : 18;
    }
    if (isTronNetwork(hre.network.name)) {
        let t = await getContract("MockToken", hre, tronFromHex(token));
        return t.decimals().call();
    }
    let ERC20 = ["function decimals() external view returns (uint8)"];
    let t = await ethers.getContractAt(ERC20, token, wallet);
    return t.decimals();
}
