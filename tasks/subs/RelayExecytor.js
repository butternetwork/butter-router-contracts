let { task } = require("hardhat/config");
let { getDeployment, saveDeployment} = require("../../utils/helper.js")


task("RelayExecytor:deploy", "deploy RelayExecytor").setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer address is:", deployer.address);
    let RelayExecytor = await ethers.getContractFactory("RelayExecytor");
    let relayExecytor = await RelayExecytor.deploy(deployer.address);
    await relayExecytor.deployed();
    console.log("RelayExecytor deploy to: ", relayExecytor.address);
    await saveDeployment(network.name, "RelayExecytor", relayExecytor.address);
});

task("RelayExecytor:set", "set")
    .addParam("relay", "relay address")
    .addParam("swap", "swap address")
    .addParam("fee", "fee manager address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);

        let RelayExecytor = await ethers.getContractFactory("RelayExecytor");
        let relayExecytor_addr = getDeployment(network.name, "RelayExecytor");
        let relayExecytor = RelayExecytor.attach(relayExecytor_addr);
        console.log("pre swap address is：", await relayExecytor.swap());
        console.log("pre relay address is：", await relayExecytor.relay());
        console.log("pre feeManager address is：", await relayExecytor.feeManager());
        await (await relayExecytor.set(taskArgs.swap, taskArgs.relay, taskArgs.fee)).wait()
        console.log("after swap address is：", await relayExecytor.swap());
        console.log("after relay address is：", await relayExecytor.relay());
        console.log("after feeManager address is：", await relayExecytor.feeManager());
    });

task("RelayExecytor:grantRole", "grantRole")
    .addParam("role", "Affiliate id")
    .addParam("user", "user address")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
        let RelayExecytor = await ethers.getContractFactory("RelayExecytor");
        let relayExecytor_addr = getDeployment(network.name, "RelayExecytor");
        let relayExecytor = RelayExecytor.attach(relayExecytor_addr);
        let role;
        if(taskArgs.role === "manage"){
          role = await relayExecytor.MANAGER_ROLE()
        } else if(taskArgs.role === "retry"){
          role = await relayExecytor.RETRY_ROLE()
        } else{
          role = await relayExecytor.DEFAULT_ADMIN_ROLE()
        }
        if(taskArgs.flag){
            await (await relayExecytor.grantRole(role, taskArgs.user)).wait();
        } else {
            await (await relayExecytor.revokeRole(role, taskArgs.user)).wait();
        }
        console.log(`${taskArgs.user} has ${taskArgs.role} role`, await relayExecytor.hasRole(role, taskArgs.user));
    });

