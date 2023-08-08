let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")

module.exports = async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let v2;
        if(chainId === 324 || chainId === 280){
            v2 = await createZk("TransferProxy",[],hre);
        } else {
            let salt = process.env.TRANSFER_PROXY_SALT;
            let ButterRouterV2 = await ethers.getContractFactory("TransferProxy");
            let result = await create(salt,ButterRouterV2.bytecode,"0x")
            v2 = result[0];
        }
        console.log("TransferProxy address :",v2);

        let deploy = await readFromFile(network.name);

        deploy[network.name]["TransferProxy"] = v2;
    
        await writeToFile(deploy);
}