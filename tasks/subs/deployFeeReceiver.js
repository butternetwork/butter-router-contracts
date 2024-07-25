let { create, createZk, readFromFile, writeToFile } = require("../../utils/create.js");
let { deployFeeReceiver } = require("../utils/tron.js");
let { verify } = require("../utils/verify.js");

module.exports = async (taskArgs, hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    let payees = taskArgs.payees.split(",");
    console.log("payees", payees);
    let shares = taskArgs.shares.split(",");
    console.log("shares", shares);
    let salt = process.env.FEE_RECEIVER_SAlT;
    let feeReceiver = await create(
        hre,
        deployer,
        "FeeReceiver",
        ["address[]", "uint256[]", "address"],
        [payees, shares, deployer],
        salt
    );
    console.log("FeeReceiver address :", feeReceiver);
    let deploy = await readFromFile(network.name);
    deploy[network.name]["FeeReceiver"] = feeReceiver;
    await writeToFile(deploy);
    const verifyArgs = [payees, shares, deployer].map((arg) => (typeof arg == "string" ? `'${arg}'` : arg)).join(" ");
    console.log(`To verify, run: npx hardhat verify --network ${network.name} ${feeReceiver} ${verifyArgs}`);
    await verify(
        feeReceiver,
        [payees, shares, deployer],
        "contracts/FeeReceiver.sol:FeeReceiver",
        hre.network.config.chainId,
        true
    );
};
