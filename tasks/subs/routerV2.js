let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")
let { task } = require("hardhat/config");
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
        await hre.run("routerV2:deploy",{mos:config.v2.mos,wtoken:config.wToken});

        let deploy_json = await readFromFile(network.name)

        let router_addr = deploy_json[network.name]["ButterRouterV2"]["addr"]

        await hre.run("routerV2:deploySwapAdapter",{});

        deploy_json = await readFromFile(network.name)

        let adapt_addr = deploy_json[network.name]["SwapAdapter"]

        config.v2.excutors.push(adapt_addr)

        let executors_s = config.v2.excutors.join(",");

        await hre.run("routerV2:setAuthorization",{router:router_addr,executors:executors_s})

        await hre.run("routerV2:setFee",{
            router:router_addr,
            feereceiver:config.v2.fee.receiver,
            feerate:config.v2.fee.feeRate,
            fixedfee:config.v2.fee.fixedFee
            })
}

task("routerV2:deploy", "deploy butterRouterV2")
    .addParam("mos", "mos address")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs,hre) => {
        const {getNamedAccounts, ethers } = hre;
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
});

task("routerV2:deploySwapAdapter", "deploy SwapAdapter")
    .setAction(async (taskArgs,hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let chainId = await hre.network.config.chainId;

        let swapAdapter;
        if(chainId === 324 || chainId === 280){
            swapAdapter = await createZk("SwapAdapter",[deployer],hre);
        } else {
            let salt = process.env.SWAP_ADAPTER_DEPLOY_SALT;
            let SwapAdapter = await ethers.getContractFactory("SwapAdapter");
            let param = ethers.utils.defaultAbiCoder.encode(['address'], [deployer])
            let result = await create(salt,SwapAdapter.bytecode, param)
            swapAdapter = result[0];
        }
        console.log("SwapAdapter address :",swapAdapter);

        let deploy = await readFromFile(network.name);

        deploy[network.name]["SwapAdapter"] = swapAdapter;
    
        await writeToFile(deploy);
});

task("routerV2:setAuthorization", "set Authorization")
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


task("routerV2:setFee", "set setFee")
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
