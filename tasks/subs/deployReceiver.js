let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")

module.exports = async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let v2;
        if(chainId === 324 || chainId === 280){
            v2 = await createZk("Receiver",[taskArgs.router,deployer],hre);
        } else {
            let salt = process.env.RECEIVER_DEPLOY_SALT;
            let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
            let ButterRouterV2 = await ethers.getContractFactory("Receiver");
            let param = ethers.utils.defaultAbiCoder.encode(['address', 'address',], [taskArgs.router, deployer])
            let result = await create(salt_hash,ButterRouterV2.bytecode,param)
            v2 = result[0];
        }
        console.log("Receiver  address :",v2);
        
        let deploy = await readFromFile(network.name);

        if(!deploy[network.name]["Receiver"]){
            deploy[network.name]["Receiver"] = {}
         }

        deploy[network.name]["Receiver"]["addr"] = v2;
    
        await writeToFile(deploy);
}