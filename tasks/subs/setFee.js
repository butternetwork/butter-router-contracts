module.exports = async (taskArgs,hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log("deployer :", deployer);

    let Router = await ethers.getContractFactory("ButterRouterV2");

    let router = Router.attach(taskArgs.router);

    let result = await (await router.setFee(taskArgs.feereceiver, taskArgs.feerate, taskArgs.fixedfee)).wait();

    if (result.status == 1) {
        console.log(`Router ${router.address} setFee rate(${taskArgs.feerate}), fixed(${taskArgs.fixedfee}), receiver(${taskArgs.feereceiver}) succeed`);
    } else {
        console.log('setFee failed');
    }
}