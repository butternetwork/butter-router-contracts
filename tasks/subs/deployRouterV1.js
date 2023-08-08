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