module.exports = async (taskArgs,hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        let Router = await ethers.getContractFactory("ButterRouter");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setButterCore(taskArgs.core)).wait();

        if (result.status == 1) {
            console.log('setCore succeed');
            console.log("new core address is:", await router.butterCore());
        } else {
            console.log('create failed');
        }
}