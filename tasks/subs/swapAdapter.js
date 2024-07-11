let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { deploySwapAdapter } = require("../utils/tron.js");
let { verify } = require("../utils/verify.js");

module.exports = async (taskArgs, hre) => {
    const { getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    let salt = process.env.SWAP_ADAPTER_DEPLOY_SALT;
    let swapAdapter = await create(hre,deployer,"SwapAdapter",["address"],[deployer],salt)
    console.log("SwapAdapter address :", swapAdapter);
    let deploy = await readFromFile(network.name);
    deploy[network.name]["SwapAdapter"] = swapAdapter;
    await writeToFile(deploy);
    const verifyArgs = [deployer].map((arg) => (typeof arg == "string" ? `'${arg}'` : arg)).join(" ");
    console.log(`To verify, run: npx hardhat verify --network ${network.name} ${swapAdapter} ${verifyArgs}`);
    await verify(swapAdapter, [deployer], "contracts/SwapAdapter.sol:SwapAdapter", hre.network.config.chainId, true);
    
};
