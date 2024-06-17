let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { deploySwapAdapter } = require("../utils/tron.js");
let { verify } = require("../utils/verify.js");

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

        await verify(swapAdapter, [deployer], "contracts/SwapAdapter.sol:SwapAdapter", chainId, true);
    }
}