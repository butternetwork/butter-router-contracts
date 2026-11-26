/**
 * Shared environment and deployment helpers for all tasks.
 * Replaces getNetworkPrefix / getDeployment / saveDeployment with common-contracts.
 */
const {
    getDeploymentByKey,
    saveDeployment,
} = require("@mapprotocol/common-contracts/utils/deployRecord");
const {
    createDeployer,
} = require("@mapprotocol/common-contracts/utils/deployer");
const {
    tronToHex,
    tronFromHex,
    isTronNetwork,
    TronClient,
} = require("@mapprotocol/common-contracts/utils/tronHelper");

// Allowed envs for mainnet networks (testnets always resolve to "test")
const MAINNET_ENVS = ["main", "prod"];

function isTestNetwork(network) {
    return network.toLowerCase().includes("test") || network === "Makalu" || network === "Sepolia";
}

/**
 * Resolve deployment env from network name.
 * - Testnet networks -> "test"
 * - Mainnet networks -> requires NETWORK_ENV (set via env var or the --env task param), "main" or "prod"
 */
function getEnv(network) {
    if (isTestNetwork(network)) return "test";
    let env = process.env.NETWORK_ENV;
    if (!env) throw `NETWORK_ENV not set for ${network}: pass --env main|prod or set NETWORK_ENV`;
    if (!MAINNET_ENVS.includes(env)) throw `invalid NETWORK_ENV "${env}", must be one of: ${MAINNET_ENVS.join(", ")}`;
    return env;
}

/**
 * Contracts that bridge through the butter bridge (config.v3.bridge) instead of
 * the TSS gateway. This address is the same for the "main" and "prod" envs.
 */
const V3_BRIDGE_CONTRACTS = new Set([
    "ButterRouterV3",
    "ButterRouterV31",
    "Receiver",
    "ReceiverV2",
    "SolanaReceiver",
]);

/**
 * TSS gateway address for the current env.
 */
function getTssGateway(network, config) {
    let env = getEnv(network);
    if (env === "main") return config.tss_main_gateway;
    if (env === "prod") return config.tss_prod_gateway;
    return config.tss_gateway;
}

/**
 * Get the bridge address a given contract should point at.
 * - V3 / V31 / Receiver / ReceiverV2 / SolanaReceiver -> v3 bridge (prod: config.v3.bridge, main: config.v3.main_bridge)
 * - V4 (and anything else) -> per-env TSS gateway
 */
function getBridge(network, config, contract) {
    if (!contract) throw "getBridge: contract name is required";
    let bridge;
    if (V3_BRIDGE_CONTRACTS.has(contract)) {
        // v3 butter bridge (MOS v3.1): prod -> v3.bridge, main -> v3.main_bridge
        let env = getEnv(network);
        let v3 = config.v3 || {};
        bridge = env === "main" ? v3.main_bridge : v3.bridge;
        // testnets only configure the TSS gateway; fall back to it there
        if (!bridge && env === "test") bridge = config.tss_gateway;
    } else {
        bridge = getTssGateway(network, config);
    }
    if (!bridge) throw `bridge address not configured for ${contract} on ${network} (env ${getEnv(network)})`;
    return bridge;
}

/**
 * Read a deployed contract address from deploy.json.
 */
async function getDeploy(network, key, env) {
    if (!env) env = getEnv(network);
    return getDeploymentByKey(network, key, { env });
}

/**
 * Save a deployed contract address to deploy.json.
 */
async function saveDeploy(network, key, addr, env) {
    if (!env) env = getEnv(network);
    return saveDeployment(network, key, addr, { env });
}

/**
 * Get a contract instance.
 * - Tron: TronClient.getContract() — write methods have .sendAndWait(), read methods use .call()
 * - EVM: ethers v6 contract — write: await (await c.method()).wait(), read: await c.method()
 */
async function getContract(contractName, hre, addr) {
    if (isTronNetwork(hre.network.name)) {
        let client = TronClient.fromHre(hre);
        return client.getContract(hre.artifacts, contractName, addr);
    }
    let factory = await hre.ethers.getContractFactory(contractName);
    return factory.attach(addr);
}

/**
 * Get deployer address (hex format for both EVM and Tron).
 */
async function getDeployerAddr(hre) {
    if (isTronNetwork(hre.network.name)) {
        return tronToHex(TronClient.fromHre(hre).defaultAddress);
    }
    let [signer] = await hre.ethers.getSigners();
    return signer.address;
}

module.exports = {
    MAINNET_ENVS,
    isTestNetwork,
    getEnv,
    getBridge,
    getTssGateway,
    getDeploy,
    saveDeploy,
    getContract,
    getDeployerAddr,
    isTronNetwork,
    tronToHex,
    tronFromHex,
    createDeployer,
};
