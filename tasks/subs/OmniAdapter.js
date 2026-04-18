const { createDeployer, getDeployerAddr, isTronNetwork, saveDeploy } = require("../utils/helper.js");

module.exports = async (taskArgs, hre) => {
    const network = hre.network.name;
    const deployer_address = await getDeployerAddr(hre);
    const salt = process.env.OMNI_ADAPTER_SALT;

    let omniAdapter;
    if (isTronNetwork(network)) {
        // Tron: no salt
        omniAdapter = await createDeployer(hre, { autoVerify: true }).deploy("OmniAdapter", [deployer_address]);
    } else {
        omniAdapter = await createDeployer(hre, { autoVerify: true }).deploy("OmniAdapter", [deployer_address], salt);
    }

    console.log("OmniAdapter address:", omniAdapter.address);
    await saveDeploy(network, "OmniAdapter", omniAdapter.address);
};
