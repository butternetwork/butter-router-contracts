let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { getTronWeb, deploy_contract } = require("../utils/tronUtils.js");
let { verify } = require("../utils/verify.js");

module.exports = async (taskArgs, hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    let salt = process.env.OMNI_ADPTER_SAlT;
    let omniAdapter = await create(hre,deployer,"OmniAdapter",["address"],[deployer],salt)
    console.log("OmniAdapter address :", omniAdapter);

    let deploy = await readFromFile(network.name);

    deploy[network.name]["omniAdapter"] = omniAdapter;
    await writeToFile(deploy);

    const verifyArgs = [deployer].map((arg) => (typeof arg == "string" ? `'${arg}'` : arg)).join(" ");
    console.log(`To verify, run: npx hardhat verify --network ${network.name} ${omniAdapter} ${verifyArgs}`);
    await verify(omniAdapter, [deployer], "contracts/OmniAdapter.sol:OmniAdapter", hre.network.config.chainId, true);

};
