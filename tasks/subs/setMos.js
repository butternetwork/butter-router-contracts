module.exports = async (taskArgs,hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    let Router = await ethers.getContractFactory("ButterRouter");

    let router = Router.attach(taskArgs.router);

    let result = await (await router.setMosAddress(taskArgs.mos)).wait();

    if (result.status == 1) {
        console.log('setMos succeed');
        console.log("new mos address is:", await router.mosAddress());
    } else {
        console.log('create failed');
    }
}