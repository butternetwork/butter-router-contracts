let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { deployFeeReceiver } = require("../utils/tronPlus.js");
let {verify} = require("../utils/verify.js")

module.exports = async (taskArgs, hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    let payees = taskArgs.payees.split(",");
    console.log("payees", payees);
    let shares = taskArgs.shares.split(",");
    console.log("shares", shares);
    if (network.name === "Tron" || network.name === "TronTest") {
        await deployFeeReceiver(hre.artifacts, network.name, payees, shares);
    } else {
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let v2;
        if (chainId === 324 || chainId === 280) {
            v2 = await createZk("FeeReceiver", [payees, shares, deployer], hre);
        } else {
            let salt = process.env.FEE_RECEIVER_SAlT;
            let FeeReceiver = await ethers.getContractFactory("FeeReceiver");
            let param = ethers.utils.defaultAbiCoder.encode(
                ["address[]", "uint256[]", "address"],
                [payees, shares, deployer]
            );
            let result = await create(salt, FeeReceiver.bytecode, param);
            v2 = result[0];
        }
        console.log("FeeReceiver address :", v2);

        let deploy = await readFromFile(network.name);

        deploy[network.name]["FeeReceiver"] = v2;
        await writeToFile(deploy);

        const verifyArgs = [payees, shares, deployer].map((arg) => (typeof arg == 'string' ? `'${arg}'` : arg)).join(' ')
        console.log(`To verify, run: npx hardhat verify --network ${network.name} ${v2} ${verifyArgs}`)
        await verify(v2,[payees, shares, deployer],"contracts/FeeReceiver.sol:FeeReceiver",chainId); 
    }
};
