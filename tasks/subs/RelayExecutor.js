const { getContract, getDeploy, saveDeploy } = require("../utils/helper.js");

task("RelayExecutor:deploy", "deploy RelayExecutor").setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const [deployer] = await ethers.getSigners();
    console.log("deployer address is:", deployer.address);

    let RelayExecutor = await ethers.getContractFactory("RelayExecutor");
    let relayExecutor = await RelayExecutor.deploy(deployer.address);
    await relayExecutor.waitForDeployment();
    let addr = await relayExecutor.getAddress();
    console.log("RelayExecutor deploy to:", addr);
    await saveDeploy(network.name, "RelayExecutor", addr);
});

task("RelayExecutor:set", "set")
    .addParam("relay", "relay address")
    .addParam("swap", "swap address")
    .addParam("fee", "fee manager address")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "RelayExecutor");
        if (!addr) throw "RelayExecutor not deployed";

        let c = await getContract("RelayExecutor", hre, addr);
        console.log("pre swap address is:", await c.swap());
        console.log("pre relay address is:", await c.relay());
        console.log("pre feeManager address is:", await c.feeManager());
        await (await c.set(taskArgs.swap, taskArgs.relay, taskArgs.fee)).wait();
        console.log("after swap address is:", await c.swap());
        console.log("after relay address is:", await c.relay());
        console.log("after feeManager address is:", await c.feeManager());
    });

task("RelayExecutor:grantRole", "grantRole")
    .addParam("role", "role name: manage | retry | default")
    .addParam("user", "user address")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "RelayExecutor");
        if (!addr) throw "RelayExecutor not deployed";

        let c = await getContract("RelayExecutor", hre, addr);
        let role;
        if (taskArgs.role === "manage") {
            role = await c.MANAGER_ROLE();
        } else if (taskArgs.role === "retry") {
            role = await c.RETRY_ROLE();
        } else {
            role = await c.DEFAULT_ADMIN_ROLE();
        }

        if (taskArgs.flag) {
            await (await c.grantRole(role, taskArgs.user)).wait();
        } else {
            await (await c.revokeRole(role, taskArgs.user)).wait();
        }
        console.log(`${taskArgs.user} has ${taskArgs.role} role`, await c.hasRole(role, taskArgs.user));
    });
