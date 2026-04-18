const { createDeployer, getDeployerAddr, isTronNetwork, saveDeploy } = require("../utils/helper.js");
const { getConfig } = require("../../configs/config.js");

module.exports = async (taskArgs, hre) => {
    const { ethers } = hre;
    const network = hre.network.name;

    let config = getConfig(network);
    if (!config) throw "config not set";

    const deployer_address = await getDeployerAddr(hre);
    const salt = process.env.SWAP_AGG_DEPLOY_SALT;

    let uniPermit2 = config.uniPermit2 || ethers.ZeroAddress;
    const args = [deployer_address, config.wToken, uniPermit2];

    let swapAggregator;
    if (isTronNetwork(network)) {
        // Tron: no salt
        swapAggregator = await createDeployer(hre, { autoVerify: true }).deploy("SwapAggregator", args);
    } else {
        swapAggregator = await createDeployer(hre, { autoVerify: true }).deploy("SwapAggregator", args, salt);
    }

    console.log("SwapAggregator address:", swapAggregator.address);
    await saveDeploy(network, "SwapAggregator", swapAggregator.address);
};
