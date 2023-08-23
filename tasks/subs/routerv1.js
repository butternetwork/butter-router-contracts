let { task } = require("hardhat/config");
let {setMos} = require("../utils/util.js");

module.exports = async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer)

        let result = await deploy('ButterRouter', {
            from: deployer,
            args: [taskArgs.mos, taskArgs.core],
            log: true,
            contract: 'ButterRouter'
            });

        console.log("router deployed to :", result.address);

}

task("routerV1:setCore", "set butter core address")
  .addParam("router", "router address")
  .addParam("core", "core address")
  .setAction(async (taskArgs) => {
        let Router = await ethers.getContractFactory("ButterRouter");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setButterCore(taskArgs.core)).wait();

        if (result.status == 1) {
        console.log('setCore succeed');
        console.log("new core address is:", await router.butterCore());
        } else {
        console.log('create failed');
        }

});

task("routerV1:setMos", "set butter router address")
  .addParam("router", "router address")
  .addParam("mos", "mos address")
  .setAction(async (taskArgs) => {
    await setMos(taskArgs.router,taskArgs.mos);
});
