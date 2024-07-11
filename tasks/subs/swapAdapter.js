let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { deploySwapAdapter } = require("../utils/tron.js");
let { verify } = require("../utils/verify.js");
const { task } = require("hardhat/config");

module.exports = async (taskArgs, hre) => {
    const { getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    if (network.name === "Tron" || network.name === "TronTest") {
        await deploySwapAdapter(hre.artifacts, network.name);
    } else {
        console.log("\ndeploySwapAdapter deployer :", deployer);
        let chainId = await hre.network.config.chainId;

        let swapAdapter;
        if (chainId === 324 || chainId === 280) {
            swapAdapter = await createZk("SwapAdapter", [deployer], hre);
        } else {
            let salt = process.env.SWAP_ADAPTER_DEPLOY_SALT;
            let SwapAdapter = await ethers.getContractFactory("SwapAdapter");
            let param = ethers.utils.defaultAbiCoder.encode(["address"], [deployer]);
            let result = await create(salt, SwapAdapter.bytecode, param);
            swapAdapter = result[0];
        }
        console.log("SwapAdapter address :", swapAdapter);

        let deploy = await readFromFile(network.name);

        deploy[network.name]["SwapAdapter"] = swapAdapter;

        await writeToFile(deploy);

        const verifyArgs = [deployer].map((arg) => (typeof arg == "string" ? `'${arg}'` : arg)).join(" ");
        console.log(`To verify, run: npx hardhat verify --network ${network.name} ${swapAdapter} ${verifyArgs}`);

        await verify(hre, swapAdapter, [deployer], "contracts/SwapAdapter.sol:SwapAdapter", true);
    }
};

task("adaptor:deploy", "deploy butterRouterV3").setAction(async (taskArgs, hre) => {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    let salt = process.env.SWAP_ADAPTER_DEPLOY_SALT;
    let swapAdapter = await create(hre, deployer, "SwapAdapter", ["address"], [deployer.address], salt);
    console.log("SwapAdapter address :", swapAdapter);

    let deploy = await readFromFile(hre.network.name);
    deploy[hre.network.name]["SwapAdapterV3"] = swapAdapter;
    await writeToFile(deploy);

    await verify(hre, swapAdapter, [deployer.address], "contracts/SwapAdapter.sol:SwapAdapter", true);
});
