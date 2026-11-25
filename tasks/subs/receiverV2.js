const { getConfig } = require("../../configs/config");
const {
    getBridge, getTssGateway, getDeploy, saveDeploy,
    getContract, getDeployerAddr, isTronNetwork, tronToHex,
    createDeployer,
} = require("../utils/helper.js");
const {
    setAuthorization, setBridge, setOwner, removeAuth,
} = require("../common/common.js");
const { httpPost } = require("../utils/httpUtil.js");

const CONTRACT = "ReceiverV2";
// deploy.json keys: ReceiverV2 -> v3 butter bridge (MOS v3.1), ReceiverV2Tss -> TSS gateway
const TSS_KEY = "ReceiverV2Tss";

function deployKey(tss) {
    return tss ? TSS_KEY : CONTRACT;
}

async function getReceiverAddress(receiver, hre, tss) {
    if (receiver && receiver !== "") return receiver;
    return getDeploy(hre.network.name, deployKey(tss));
}

// ============================================================
// Main orchestration task
// ============================================================
module.exports = async (taskArgs, hre) => {
    const { network } = hre;
    let config = getConfig(network.name);
    if (!config) throw "config not set";

    let tss = !!taskArgs.tss;
    let bridge = tss ? getTssGateway(network.name, config) : getBridge(network.name, config, CONTRACT);
    if (!bridge) throw `bridge not configured for ${deployKey(tss)} on ${network.name}`;

    console.log(`deploy ${deployKey(tss)} with bridge:`, bridge);
    await hre.run("receiverV2:deploy", { bridge, wtoken: config.wToken, tss });

    let receiver_addr = await getReceiverAddress("", hre, tss);
    let adapt_addr = await getDeploy(network.name, "SwapAdapterV3", "prod");
    config.v3.executors.push(adapt_addr);
    config.v3.executors.push(config.wToken);
    let executors_s = config.v3.executors.join(",");
    await hre.run("receiverV2:setAuthorization", { receiver: receiver_addr, executors: executors_s });
};

// ============================================================
// Deploy
// ============================================================
task("receiverV2:deploy", "Deploy ReceiverV2 contract")
    .addParam("bridge", "Bridge address")
    .addParam("wtoken", "Wrapped token address")
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let key = deployKey(taskArgs.tss);
        let deployer = createDeployer(hre, { autoVerify: true });
        let deployerAddr = await getDeployerAddr(hre);

        if (isTronNetwork(network.name)) {
            let bridge = tronToHex(taskArgs.bridge);
            let wtoken = tronToHex(taskArgs.wtoken);
            let result = await deployer.deploy(CONTRACT, [deployerAddr, wtoken, bridge]);
            console.log(`${key} address: ${result.address}`);
            await saveDeploy(network.name, key, result.address);
        } else {
            let salt = process.env.RECEIVER_V2_DEPLOY_SALT || "";
            let result = await deployer.deploy(CONTRACT, [deployerAddr, taskArgs.wtoken, taskArgs.bridge], salt);
            console.log(`${key} address: ${result.address}`);
            await saveDeploy(network.name, key, result.address);
        }
    });

// ============================================================
// Configuration tasks
// ============================================================
task("receiverV2:setAuthorization", "Set executor authorization")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .addParam("executors", "Comma-separated executor addresses")
    .addOptionalParam("flag", "Authorization flag", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        let addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
        let list = taskArgs.executors.split(",").map(e => e.trim());
        await setAuthorization(hre, CONTRACT, addr, list, taskArgs.flag);
    });

task("receiverV2:setBridge", "Set bridge address")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .addParam("bridge", "Bridge address")
    .setAction(async (taskArgs, hre) => {
        let addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
        await setBridge(hre, CONTRACT, addr, taskArgs.bridge);
    });

task("receiverV2:updateKeepers", "Update keeper authorization (comma-separated)")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .addParam("keepers", "Keeper addresses (comma-separated)")
    .addOptionalParam("flag", "Authorization flag", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
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
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .addParam("owner", "New owner address")
    .setAction(async (taskArgs, hre) => {
        let addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
        await setOwner(hre, CONTRACT, addr, taskArgs.owner);
    });

task("receiverV2:acceptOwnership", "Accept ownership")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .setAction(async (taskArgs, hre) => {
        let addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
        let c = await getContract(CONTRACT, hre, addr);
        await (await c.acceptOwnership()).wait();
        console.log(`${CONTRACT} ${addr} ownership accepted by`, await c.owner());
    });
    
// ============================================================
// Update (delegates to individual tasks which compare before send)
// ============================================================
task("receiverV2:update", "Check and update from config file")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .setAction(async (taskArgs, hre) => {
        let addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
        let config = getConfig(hre.network.name);
        if (!config) throw "config not set";

        let adapt_addr;
        try { adapt_addr = await getDeploy(hre.network.name, "SwapAdapterV3", "prod"); } catch (e) {}
        let executors = [...config.v3.executors];
        if (adapt_addr) executors.push(adapt_addr);

        await setAuthorization(hre, CONTRACT, addr, executors);
        await removeAuth(hre, CONTRACT, addr, config.removes);
        console.log("ReceiverV2 update completed.");
    });

task("receiverV2:removeAuthFromConfig", "Remove authorization from config")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .setAction(async (taskArgs, hre) => {
        let addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
        let config = getConfig(hre.network.name);
        if (!config) throw "config not set";
        await removeAuth(hre, CONTRACT, addr, config.removes);
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
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .addParam("hash", "Transaction hash")
    .addParam("entrance", "Entrance of swap like ButterPlus, ButterTest, Okx etc.")
    .addOptionalParam("slippage", "Slippage tolerance in percentage (default 300 = 3%)", "300", types.string)
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
        let c = await getContract(CONTRACT, hre, receiver_addr);

        // Fetch execSwap tx params from the Butter internal backend. The backend decodes the
        // failed tx, fetches the route and generates the swap calldata server-side, returning
        // ready-to-send execSwap tx params (same shape as the swapRescueFunds tx params).
        let url = process.env.BUTTER_ROUTER_API;
        if (!url) throw "BUTTER_ROUTER_API not set in .env";
        let key = process.env.ROUTER_API_KEY;
        if (!key) throw "ROUTER_API_KEY not set in .env";

        let toChainId = network.config.chainId;
        let query = `toChainId=${toChainId}&txHash=${taskArgs.hash}&entrance=${encodeURIComponent(taskArgs.entrance)}&slippage=${taskArgs.slippage}`;
        let j = await httpPost(`${url}?${query}`, {}, { Authorization: `Bearer ${key}` });
        if (!j || j.errno !== 0) {
            console.log("API error:", j);
            return;
        }

        let routes = j.data && j.data.routeWithTxParams;
        if (!routes || routes.length === 0) {
            console.log("No viable swap route from API. minReceivedInLog:", j.data && j.data.minReceivedInLog);
            console.log("Use `receiverV2:swapRescueFunds` to refund the user instead.");
            return;
        }

        // routeWithTxParams[i] has the same shape as rescueFundsTxParam:
        // { to, data, value, chainId, method, args } where args follows the contract signature
        // execSwap(orderId, fromChain, srcToken, amount, from, swapData, callbackData).
        let tx = routes[0];
        let args = tx.args;
        let orderId = args[0].value;
        let fromChain = args[1].value;
        let srcToken = args[2].value;
        let amount = args[3].value;
        let from = args[4].value;
        let swapData = args[5].value;
        let callbackData = args[6].value;

        await checkNotExecuted(hre, c, orderId);

        console.log("orderId:", orderId);
        console.log("srcToken:", srcToken, "amount:", amount, "fromChain:", fromChain);

        if (isTronNetwork(network.name)) {
            await c.execSwap(orderId, fromChain, srcToken, amount, from, swapData, callbackData).sendAndWait();
        } else {
            await (await c.execSwap(orderId, fromChain, srcToken, amount, from, swapData, callbackData, { gasLimit: 5000000 })).wait();
        }
        console.log("execSwap succeeded");
    });

task("receiverV2:swapRescueFunds", "Rescue funds from failed swap (send token directly to user)")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .addParam("hash", "Transaction hash")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let receiver_addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
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

task("receiverV2:rescueFunds", "Rescue stuck funds (owner withdraws token/native by amount)")
    .addOptionalParam("receiver", "Receiver address", "", types.string)
    .addFlag("tss", "Use the TSS-gateway receiver (deploy key ReceiverV2Tss) instead of the v3/MOS one")
    .addParam("token", "Token address (zero address for native)")
    .addParam("amount", "Amount in smallest unit")
    .setAction(async (taskArgs, hre) => {
        let addr = await getReceiverAddress(taskArgs.receiver, hre, taskArgs.tss);
        let c = await getContract(CONTRACT, hre, addr);

        let caller = await getDeployerAddr(hre);
        console.log("caller:", caller);

        if (isTronNetwork(hre.network.name)) {
            await c.rescueFunds(tronToHex(taskArgs.token), taskArgs.amount).sendAndWait();
        } else {
            await (await c.rescueFunds(taskArgs.token, taskArgs.amount)).wait();
        }
        console.log(`${CONTRACT} ${addr} rescueFunds ${taskArgs.token} ${taskArgs.amount}`);
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
