
module.exports = async function (hre) {
    const {deployments,ethers} = hre
    const {deploy} = deployments
    const accounts = await ethers.getSigners()
    const deployer = accounts[0];
    let bridge = "0xfeB2b97e4Efce787c08086dC16Ab69E063911380";
    let wToken = "0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23"
    await deploy('SolanaReceiver', {
        from: deployer.address,
        args: [deployer.address,wToken,bridge],
        log: true,
        contract: 'SolanaReceiver',
    })
}

module.exports.tags = ['SolanaReceiver']