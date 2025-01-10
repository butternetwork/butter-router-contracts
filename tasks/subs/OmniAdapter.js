let { create, getTronDeployer} = require("../../utils/create.js");
let { verify } = require("../../utils/verify.js");
let { saveDeployment } = require("../../utils/helper.js")

module.exports = async (taskArgs, hre) => {
    const {network, ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    let deployer_address
    if(network.name === "Tron" || network.name === "TronTest"){
        deployer_address = await getTronDeployer(true, network.name);
    } else {
        deployer_address = deployer.address
    }
    let salt = process.env.OMNI_ADPTER_SAlT;
    let omniAdapter = await create(hre, deployer, "OmniAdapter", ["address"], [deployer_address], salt);
    console.log("OmniAdapter address :", omniAdapter);
    await saveDeployment(network.name, "OmniAdapter", omniAdapter);
    await verify(omniAdapter, [deployer_address], "contracts/OmniAdapter.sol:OmniAdapter", network.config.chainId, true);
};
