let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")

module.exports = async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let v2;
        if(chainId === 324 || chainId === 280){
            v2 = await createZk("ButterRouterV2",[taskArgs.mos, deployer, taskArgs.wtoken],hre);
        } else {
            let salt = process.env.ROUTER_DEPLOY_SALT;
            let ButterRouterV2 = await ethers.getContractFactory("ButterRouterV2");
            let param = ethers.utils.defaultAbiCoder.encode(['address', 'address', 'address'], [taskArgs.mos, deployer, taskArgs.wtoken])
            let result = await create(salt,ButterRouterV2.bytecode, param)
            v2 = result[0];
        }
        console.log("router v2 address :",v2);
        let deploy = await readFromFile(network.name);

        if(!deploy[network.name]["ButterRouterV2"]){
            deploy[network.name]["ButterRouterV2"] = {}
        }
       
        deploy[network.name]["ButterRouterV2"]["addr"] = v2;
    
        await writeToFile(deploy);
}