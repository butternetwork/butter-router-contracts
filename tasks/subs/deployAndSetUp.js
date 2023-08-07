let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")
let {getConfig} = require("../../configs/config")


module.exports = async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let config = getConfig(network.name);
        if(!config){
            throw("config not set");
        }
        if(taskArgs.routertype === "v2"){
            console.log("<------------------------ deployAndSetup v2 begin ---------------------------->")
            let ButterRouterV2 = await ethers.getContractFactory("ButterRouterV2");
            let addr;
            let swapAdapter_addr;
            if(chainId === 324 || chainId === 280){
              addr = await createZk("ButterRouterV2",[config.v2.mos,deployer,config.wToken],hre);
              swapAdapter_addr = await createZk("SwapAdapter",[deployer],hre)
            } else {
               let salt = process.env.ROUTER_DEPLOY_SALT;
               let param = ethers.utils.defaultAbiCoder.encode(['address', 'address', 'address'], [config.v2.mos, deployer, config.wToken])
               let result = await create(salt,ButterRouterV2.bytecode,param);
               addr = result[0]
               let SwapAdapter = await ethers.getContractFactory("SwapAdapter"); 
               param = ethers.utils.defaultAbiCoder.encode(['address'], [deployer])
               result = await create(process.env.SWAP_ADAPTER_DEPLOY_SALT,SwapAdapter.bytecode,param)
               swapAdapter_addr = result[0];
            }
            let router = ButterRouterV2.attach(addr);
            result = await (await router.setFee(config.v2.fee.receiver, config.v2.fee.feeRate, config.v2.fee.fixedFee)).wait();
            if (result.status == 1) {
                console.log(`Router ${router.address} setFee rate(${config.v2.fee.feeRate}), fixed(${config.v2.fee.fixedFee}), receiver(${config.v2.fee.receiver}) succeed`);
            } else {
                console.log('setFee failed');
            }

            config.v2.excutors.push(swapAdapter_addr);
            result = await (await router.setAuthorization(config.v2.excutors,true)).wait();
            if (result.status == 1) {
                console.log(`Router ${router.address} setAuthorization ${config.v2.excutors} succeed`);
            } else {
                console.log('setAuthorization failed');
            }
            let deploy = await readFromFile(network.name);

            if(!deploy[network.name]["ButterRouterV2"]){
                deploy[network.name]["ButterRouterV2"] = {}
            }
            deploy[network.name]["SwapAdapter"] = swapAdapter_addr;
            deploy[network.name]["ButterRouterV2"]["addr"] = addr;
            deploy[network.name]["ButterRouterV2"]["swapAdapter"] = swapAdapter_addr;
            deploy[network.name]["ButterRouterV2"]["feeReceiver"] = config.v2.fee.receiver;
            await writeToFile(deploy);
           console.log("<----------------------------- deployAndSetUp v2... done ----------------------->");

        } else if(taskArgs.routertype === "plus"){
            console.log("<------------------------ deployAndSetup puls begin ---------------------------->")
            let ButterRouterPlus = await ethers.getContractFactory("ButterRouterPlus");
            let addr;
            if(chainId === 324 || chainId === 280){
                addr  = await createZk("ButterRouterPlus",[deployer,config.wToken],hre);
            } else {
                let salt = process.env.PLUS_DEPLOY_SALT;
                let param = ethers.utils.defaultAbiCoder.encode(['address', 'address'], [deployer, config.wToken])
                let result = await create(salt,ButterRouterPlus.bytecode,param);
                addr = result[0]
            }

            let router = ButterRouterPlus.attach(addr);
            result = await (await router.setFee(config.plus.fee.receiver, config.plus.fee.feeRate, config.plus.fee.fixedFee)).wait();
            if (result.status == 1) {
                console.log(`Router ${router.address} setFee rate(${config.plus.fee.feeRate}), fixed(${config.plus.fee.fixedFee}), receiver(${config.plus.fee.receiver}) succeed`);
            } else {
                console.log('setFee failed');
            }
            result = await (await router.setAuthorization(config.plus.excutors,true)).wait();
            if (result.status == 1) {
                console.log(`Router ${router.address} setAuthorization ${config.plus.excutors} succeed`);
            } else {
                console.log('setAuthorization failed');
            }

            let deploy = await readFromFile(network.name);

            if(!deploy[network.name]["ButterRouterPlus"]){
                deploy[network.name]["ButterRouterPlus"] = {}
            }
            deploy[network.name]["ButterRouterPlus"]["addr"] = addr;
            deploy[network.name]["ButterRouterPlus"]["feeReceiver"] = config.plus.fee.receiver;
        
            await writeToFile(deploy);

           console.log("<----------------------------- deployAndSetUp plus ... done ----------------------->");
        } else {
            throw("unsupport router type");
        }
        

}