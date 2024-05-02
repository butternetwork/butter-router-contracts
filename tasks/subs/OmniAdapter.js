let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { getTronWeb, deploy_contract } = require("../utils/tronUtils.js");
let { verify } = require("../utils/verify.js");

module.exports = async (taskArgs, hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();

    if (network.name === "Tron" || network.name === "TronTest") {
        let tronWeb = await getTronWeb(network.name);
        let deployer = "0x" + tronWeb.defaultAddress.hex.substring(2);
        console.log("deployer :", tronWeb.address.fromHex(deployer));
        let omniAdapter = await deploy_contract(hre.artifacts, "OmniAdapter", [deployer]);
        console.log("omniAdapter deployed on :", omniAdapter);
        let deploy = await readFromFile(network.name);
        deploy[network.name]["omniAdapter"] = omniAdapter;
        await writeToFile(deploy);
    } else {
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let omniAdapter;
        if (chainId === 324 || chainId === 280) {
            omniAdapter = await createZk("OmniAdapter", [deployer], hre);
        } else {
            let salt = process.env.OMNI_ADPTER_SAlT;
            let OmniAdapter = await ethers.getContractFactory("OmniAdapter");
            let param = ethers.utils.defaultAbiCoder.encode(["address"], [deployer]);
            let result = await create(salt, OmniAdapter.bytecode, param);
            omniAdapter = result[0];
        }
        console.log("omniAdapter address :", omniAdapter);

        let deploy = await readFromFile(network.name);

        deploy[network.name]["omniAdapter"] = omniAdapter;
        await writeToFile(deploy);

        const verifyArgs = [deployer].map((arg) => (typeof arg == "string" ? `'${arg}'` : arg)).join(" ");
        console.log(`To verify, run: npx hardhat verify --network ${network.name} ${omniAdapter} ${verifyArgs}`);
        await verify(omniAdapter, [deployer], "contracts/OmniAdapter.sol:OmniAdapter", chainId, true);
    }
};
