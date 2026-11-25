module.exports = async function ({ ethers, deployments }) {
    const { deploy } = deployments;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log("deployer address:", deployer.address);

    await deploy("SwapAdapter", {
        from: deployer.address,
        args: [deployer.address],
        log: true,
        contract: "SwapAdapter",
    });

    let adapter = await deployments.get("SwapAdapter");

    console.log("SwapAdapter address:", adapter.address);
};

module.exports.tags = ["Adapter"];
