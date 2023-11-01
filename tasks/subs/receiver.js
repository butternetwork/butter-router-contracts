let { task } = require("hardhat/config");

module.exports = async (taskArgs, hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    console.log("deployer :", deployer);
    let chainId = await hre.network.config.chainId;
    let v2;
    if (chainId === 324 || chainId === 280) {
        v2 = await createZk("Receiver", [taskArgs.router, deployer], hre);
    } else {
        let salt = process.env.RECEIVER_DEPLOY_SALT;
        let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
        let ButterRouterV2 = await ethers.getContractFactory("Receiver");
        let param = ethers.utils.defaultAbiCoder.encode(["address", "address"], [taskArgs.router, deployer]);
        let result = await create(salt_hash, ButterRouterV2.bytecode, param);
        v2 = result[0];
    }
    console.log("Receiver  address :", v2);

    let deploy = await readFromFile(network.name);

    if (!deploy[network.name]["Receiver"]) {
        deploy[network.name]["Receiver"] = {};
    }

    deploy[network.name]["Receiver"]["addr"] = v2;

    await writeToFile(deploy);
};

task("receiver:setRouter", "set bridges router address")
    .addParam("receiver", "receiver address")
    .addParam("name", "router name")
    .addParam("router", "router address")
    .setAction(async (taskArgs) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();

        let Receiver = await ethers.getContractFactory("Receiver");

        let receiver = Receiver.attach(taskArgs.receiver);

        let result;

        if (taskArgs.name === "cbridge") {
            result = await (await receiver.setCBridgeMessageBus(taskArgs.router)).wait();
        } else if (taskArgs.name === "amarok") {
            result = await (await receiver.setAmarokRouter(taskArgs.router)).wait();
        } else if (taskArgs.name === "stargate") {
            result = await (await receiver.setStargateRouter(taskArgs.router)).wait();
        } else if (taskArgs.name === "butter") {
            result = await (await receiver.setAuthorization(taskArgs.router)).wait();
        } else {
            throw "unspport name";
        }

        if (result.status == 1) {
            console.log(`set ${taskArgs.name} succeed`);
        } else {
            console.log(`set ${taskArgs.name} failed`);
        }

        let deploy = await readFromFile(network.name);

        if (!deploy[network.name]["Receiver"]) {
            deploy[network.name]["Receiver"] = {};
        }

        deploy[network.name]["Receiver"][taskArgs.name] = taskArgs.router;

        await writeToFile(deploy);
    });
