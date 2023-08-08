let {readFromFile,writeToFile} = require("../../utils/create.js")
module.exports = async (taskArgs,hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();

    let Receiver = await ethers.getContractFactory("Receiver");

    let receiver = Receiver.attach(taskArgs.receiver);

    let result;

    if(taskArgs.name === "cbridge"){
        result = await (await receiver.setCBridgeMessageBus(taskArgs.router)).wait();
    } else if(taskArgs.name === "amarok"){
        result = await (await receiver.setAmarokRouter(taskArgs.router)).wait();
    } else if(taskArgs.name === "stargate"){
        result = await (await receiver.setStargateRouter(taskArgs.router)).wait();
    }else if(taskArgs.name === "butter"){
        result = await (await receiver.setAuthorization(taskArgs.router)).wait();
    } else {
        throw("unspport name");
    }
    
    if (result.status == 1) {
        console.log(`set ${taskArgs.name} succeed`);
    } else {
        console.log(`set ${taskArgs.name} failed`);
    }

    let deploy = await readFromFile(network.name);

    if(!deploy[network.name]["Receiver"]){
       deploy[network.name]["Receiver"] = {}
    }

    deploy[network.name]["Receiver"][taskArgs.name] = taskArgs.router;

    await writeToFile(deploy);
}