const { createDeployer, getDeployerAddr, isTronNetwork, saveDeploy } = require("../utils/helper.js");

module.exports = async (taskArgs, hre) => {
    const network = hre.network.name;
    const deployer_address = await getDeployerAddr(hre);
    const salt = process.env.SWAP_ADAPTER_DEPLOY_SALT;

    let swapAdapter;
    if (isTronNetwork(network)) {
        // Tron: no salt
        swapAdapter = await createDeployer(hre, { autoVerify: true }).deploy("SwapAdapter", [deployer_address]);
    } else {
        swapAdapter = await createDeployer(hre, { autoVerify: true }).deploy("SwapAdapter", [deployer_address], salt);
    }

    console.log("SwapAdapter address:", swapAdapter.address);
    await saveDeploy(network, "SwapAdapterV3", swapAdapter.address);
};
