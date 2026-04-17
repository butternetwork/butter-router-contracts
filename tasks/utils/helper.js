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

/**
 * Resolve deployment env from network name.
 * - Testnet networks -> "test"
 * - Mainnet networks -> requires NETWORK_ENV (e.g. "main", "prod")
 */
function getEnv(network) {
    const lower = network.toLowerCase();
    if (lower.includes("test") || network === "Makalu" || network === "Sepolia") {
        return "test";
    }
    let env = process.env.NETWORK_ENV;
    if (!env) throw "NETWORK_ENV not set (e.g. NETWORK_ENV=main or NETWORK_ENV=prod)";
    return env;
}

/**
 * Get bridge address from config based on env.
 */
function getBridge(network, config) {
    let env = getEnv(network);
    if (env === "main") return config.tss_main_gateway;
    if (env === "prod") return config.tss_prod_gateway;
    return config.tss_gateway;
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
    getEnv,
    getBridge,
    getDeploy,
    saveDeploy,
    getContract,
    getDeployerAddr,
    isTronNetwork,
    tronToHex,
    tronFromHex,
    createDeployer,
};
