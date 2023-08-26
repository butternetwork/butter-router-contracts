let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")
let {task } = require("hardhat/config");
let {getConfig} = require("../../configs/config")
let {setAuthorization,setFee} = require("../utils/util.js");

module.exports = async (taskArgs,hre) => {
        const {getNamedAccounts, network } = hre;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer)
        let config = getConfig(network.name);
        if(!config){
            throw("config not set");
        }
        await hre.run("routerPlus:deploy",{mos:config.v2.mos,wtoken:config.wToken});

        let deploy_json = await readFromFile(network.name)

        let router_addr = deploy_json[network.name]["ButterRouterPlus"]["addr"]

        await hre.run("routerPlus:deployTransferProxy",{});

        deploy_json = await readFromFile(network.name)

        let proxy_addr =  deploy_json[network.name]["TransferProxy"]

        config.plus.excutors.push(proxy_addr);

        let executors_s = config.plus.excutors.join(",");

        await hre.run("routerPlus:setAuthorization",{router:router_addr,executors:executors_s})

        await hre.run("routerPlus:setFee",{
            router:router_addr,
            feereceiver:config.plus.fee.receiver,
            feerate:config.plus.fee.feeRate,
            fixedfee:config.plus.fee.fixedFee
        })
}

task("routerPlus:deploy", "deploy ButterRouterPlus")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs,hre) => {
        const {getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let plus;
        if(chainId === 324 || chainId === 280){
            plus = await createZk("ButterRouterPlus",[deployer, taskArgs.wtoken],hre);
        } else {
            let salt = process.env.PLUS_DEPLOY_SALT;
            let ButterRouterPlus = await ethers.getContractFactory("ButterRouterPlus");
            let param = ethers.utils.defaultAbiCoder.encode(['address', 'address'], [deployer, taskArgs.wtoken])
            let result = await create(salt,ButterRouterPlus.bytecode, param)
            plus = result[0];
        }
        console.log("router plus address :",plus);
        let deploy = await readFromFile(network.name);

        if(!deploy[network.name]["ButterRouterPlus"]){
            deploy[network.name]["ButterRouterPlus"] = {}
        }
       
        deploy[network.name]["ButterRouterPlus"]["addr"] = plus;
    
        await writeToFile(deploy);
});

task("routerPlus:deployTransferProxy", "deploy transferProxy")
    .setAction(async (taskArgs,hre) => {
        const {getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;
        let proxy;
        if(chainId === 324 || chainId === 280){
            proxy = await createZk("TransferProxy",[],hre);
        } else {
            let salt = process.env.TRANSFER_PROXY_SALT;
            let TransferProxy = await ethers.getContractFactory("TransferProxy");
            let result = await create(salt,TransferProxy.bytecode,"0x")
            proxy = result[0];
        }
        console.log("TransferProxy address :",proxy);

        let deploy = await readFromFile(network.name);

        deploy[network.name]["TransferProxy"] = proxy;
    
        await writeToFile(deploy);
});


task("routerPlus:setAuthorization", "set Authorization")
    .addParam("router", "router address")
    .addParam("executors", "executors address array")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer);

        await setAuthorization(taskArgs.router,taskArgs.executors,taskArgs.flag);
});


task("routerPlus:setFee", "set fee")
    .addParam("router", "router address")
    .addParam("feereceiver", "feeReceiver address")
    .addParam("feerate", "feeRate")
    .addParam("fixedfee", "fixedFee")
    .setAction(async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer);

        await setFee(taskArgs.router,taskArgs.feereceiver,taskArgs.feerate,taskArgs.fixedfee);
});
