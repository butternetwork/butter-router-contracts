let { create, getTronDeployer } = require("../../utils/create.js");
let { verify } = require("../../utils/verify.js");
let { saveDeployment } = require("../../utils/helper.js");
let { getConfig } = require("../../configs/config.js");

module.exports = async (taskArgs, hre) => {
    const { ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    let config = getConfig(network.name);
    if (!config) {
        throw "config not set";
    }
    let deployer_address;
    if (network.name === "Tron" || network.name === "TronTest") {
        deployer_address = await getTronDeployer(true, network.name);
    } else {
        deployer_address = deployer.address;
    }
    let salt = process.env.SWAP_AGG_DEPLOY_SALT;
    let uniPermit2 = config.uniPermit2;
    if(!uniPermit2) uniPermit2 = ethers.constants.AddressZero;
    let swapAggregator = await create(hre, deployer, "SwapAggregator", ["address", "address", "address"], [deployer_address, config.wToken, uniPermit2], salt);
    console.log("SwapAggregator address :", swapAggregator);
    await saveDeployment(network.name, "SwapAggregator", swapAggregator);
    await verify(
        swapAggregator,
        [deployer_address, config.wToken, uniPermit2],
        "contracts/SwapAggregator.sol:SwapAggregator",
        hre.network.config.chainId,
        true
    );
};
