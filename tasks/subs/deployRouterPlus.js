let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")

module.exports = async (taskArgs,hre) => {
    const { deployments, getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let v2;
        if(chainId === 324 || chainId === 280){
            v2 = await createZk("ButterRouterPlus",[deployer, taskArgs.wtoken],hre);
        } else {
            let salt = process.env.PLUS_DEPLOY_SALT;
            let ButterRouterV2 = await ethers.getContractFactory("ButterRouterPlus");
            let param = ethers.utils.defaultAbiCoder.encode(['address', 'address'], [deployer, taskArgs.wtoken])
            let result = await create(salt,ButterRouterV2.bytecode, param)
            v2 = result[0];
        }
        console.log("router plus address :",v2);
                
        let deploy = await readFromFile(network.name);

        if(!deploy[network.name]["ButterRouterPlus"]){
            deploy[network.name]["ButterRouterPlus"] = {}
        }
        deploy[network.name]["ButterRouterPlus"]["addr"] = v2;
    
        await writeToFile(deploy);
}