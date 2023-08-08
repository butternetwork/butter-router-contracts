let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")

module.exports = async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let v2;
        let payees = taskArgs.payees.split(',');
        console.log("payees",payees);
        let shares = taskArgs.shares.split(',')
        console.log("shares",shares);
        if(chainId === 324 || chainId === 280){
            v2 = await createZk("FeeReceiver",[payees,shares,deployer],hre);
        } else {
            let salt = process.env.FEE_RECEIVER_SAlT;
            let ButterRouterV2 = await ethers.getContractFactory("FeeReceiver");
            let param = ethers.utils.defaultAbiCoder.encode(['address[]', 'uint256[]','address'], [payees,shares,deployer])
            let result = await create(salt,ButterRouterV2.bytecode, param)
            v2 = result[0];
        }
        console.log("FeeReceiver address :",v2);

        let deploy = await readFromFile(network.name);

        deploy[network.name]["FeeReceiver"] = v2;
    
        await writeToFile(deploy);
}