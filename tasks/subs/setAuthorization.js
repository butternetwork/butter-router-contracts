module.exports = async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer);

        let executors = taskArgs.executors.split(',');

        if(executors.length < 1){
            console.log("executors is empty ...");
            return;
        }

        let Router = await ethers.getContractFactory("ButterRouterV2");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setAuthorization(executors, taskArgs.flag)).wait();

        if (result.status == 1) {
            console.log(`Router ${router.address} setAuthorization ${executors} succeed`);
        } else {
            console.log('setAuthorization failed');
        }
}