let { create, getTronDeployer } = require("../../utils/create.js");
let { verify } = require("../../utils/verify.js");
let { saveDeployment } = require("../../utils/helper.js");

module.exports = async (taskArgs, hre) => {
    const { ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    let deployer_address;
    if (network.name === "Tron" || network.name === "TronTest") {
        deployer_address = await getTronDeployer(true, network.name);
    } else {
        deployer_address = deployer.address;
    }
    let salt = process.env.SWAP_ADAPTER_DEPLOY_SALT;
    let swapAdapter = await create(hre, deployer, "SwapAdapter", ["address"], [deployer_address], salt);
    console.log("SwapAdapter address :", swapAdapter);
    await saveDeployment(network.name, "SwapAdapterV3", swapAdapter);
    await verify(
        swapAdapter,
        [deployer_address],
        "contracts/SwapAdapter.sol:SwapAdapter",
        hre.network.config.chainId,
        true
    );
};
