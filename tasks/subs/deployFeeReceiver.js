let { create, getTronDeployer} = require("../../utils/create.js");
let { verify } = require("../../utils/verify.js");
let { saveDeployment } = require("../../utils/helper.js")

module.exports = async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    let deployer_address
    if(network.name === "Tron" || network.name === "TronTest"){
        deployer_address = await getTronDeployer(true, network.name);
    } else {
        deployer_address = deployer.address;
    }
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
        [payees, shares, deployer_address],
        salt
    );
    console.log("FeeReceiver address :", feeReceiver);
    await saveDeployment(network.name, "FeeReceiver", feeReceiver);
    await verify(feeReceiver, [payees, shares, deployer_address], "contracts/FeeReceiver.sol:FeeReceiver", network.config.chainId, true);
};
