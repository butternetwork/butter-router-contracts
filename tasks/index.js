let { task } = require("hardhat/config");
const { HardhatContext } = require("hardhat/internal/context");
const { MAINNET_ENVS, isTestNetwork } = require("./utils/helper.js");

// Snapshot built-in tasks so --env is only added to this project's tasks
const tasksDSL = HardhatContext.getHardhatContext().tasksDSL;
const builtinTasks = new Set(Object.keys(tasksDSL.getTaskDefinitions()));

require("./subs/IntegratorManager.js");
require("./subs/flatten.js");
task("routerV3", "deploy butter router V3 contract and set", require("./subs/routerV3.js"));
task("routerV31", "deploy butter router V31 contract and set", require("./subs/routerV31.js"));
task("routerV4", "deploy butter router V4 contract and set", require("./subs/routerV4.js"));
task("receiver", "deploy receiver contract and set", require("./subs/receiver.js"));
task("receiverV2", "deploy receiver V2 contract and set", require("./subs/receiverV2.js"))
    .addFlag("tss", "Deploy the TSS-gateway receiver (key ReceiverV2Tss) instead of the v3/MOS one");
task("deploySwapAdapter", "deploy swapAdapter contract", require("./subs/swapAdapter.js"));
task("deploySwapAggregator", "deploy SwapAggregator contract", require("./subs/swapAggregator.js"));
task("deployFeeReceiver", "deploy feeReceiver", require("./subs/deployFeeReceiver.js"))
    .addParam("payees", "payees address array")
    .addParam("shares", "shares array");

task("deployOmniAdapter", "deploy OmniAdapter", require("./subs/OmniAdapter.js"));
task("solanaReceiver", "deploy solana receiver contract and set", require("./subs/solanaReveiver.js"));
require("./subs/AffiliateFeeManager.js");
require("./subs/RelayExecutor.js");
require("./subs/verify.js");

/**
 * Add a global-style --env param to every project task.
 * --env overrides NETWORK_ENV; the resolved env is printed before the task runs.
 */
for (const [name, def] of Object.entries(tasksDSL.getTaskDefinitions())) {
    if (builtinTasks.has(name)) continue;
    if (def.paramDefinitions.env) continue; // task already defines its own --env

    def.addOptionalParam("env", `Deployment env for mainnet networks: ${MAINNET_ENVS.join(" | ")} (overrides NETWORK_ENV)`);
    const action = def.action;
    def.setAction(async (taskArgs, hre, runSuper) => {
        const network = hre.network.name;
        if (taskArgs.env) {
            if (isTestNetwork(network)) {
                console.log(`WARNING: --env ${taskArgs.env} ignored, ${network} is a testnet (env: test)`);
            } else if (!MAINNET_ENVS.includes(taskArgs.env)) {
                throw `invalid --env "${taskArgs.env}", must be one of: ${MAINNET_ENVS.join(", ")}`;
            } else {
                process.env.NETWORK_ENV = taskArgs.env;
            }
        }
        const env = isTestNetwork(network) ? "test" : process.env.NETWORK_ENV || "(not set)";
        console.log(`>>> env: ${env}, network: ${network}`);
        return action(taskArgs, hre, runSuper);
    });
}
