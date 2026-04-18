const { createDeployer, getDeployerAddr, isTronNetwork, saveDeploy } = require("../utils/helper.js");

module.exports = async (taskArgs, hre) => {
    const network = hre.network.name;
    const deployer_address = await getDeployerAddr(hre);
    const salt = process.env.FEE_RECEIVER_SALT;

    let payees = taskArgs.payees.split(",");
    console.log("payees", payees);
    let shares = taskArgs.shares.split(",");
    console.log("shares", shares);

    const args = [payees, shares, deployer_address];

    let feeReceiver;
    if (isTronNetwork(network)) {
        // Tron: no salt
        feeReceiver = await createDeployer(hre, { autoVerify: true }).deploy("FeeReceiver", args);
    } else {
        feeReceiver = await createDeployer(hre, { autoVerify: true }).deploy("FeeReceiver", args, salt);
    }

    console.log("FeeReceiver address:", feeReceiver.address);
    await saveDeploy(network, "FeeReceiver", feeReceiver.address);
};
