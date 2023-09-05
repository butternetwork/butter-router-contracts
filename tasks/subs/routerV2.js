let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")
let { task } = require("hardhat/config");
let {getConfig} = require("../../configs/config")
let {setAuthorization,setFee} = require("../utils/util.js");

module.exports = async (taskArgs,hre) => {
        const {getNamedAccounts, network } = hre;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer)
        let config = getConfig(network.name);
        if (!config) {
            throw("config not set");
        }
        await hre.run("routerV2:deploy",{mos:config.v2.mos, wtoken:config.wToken});

        let deploy_json = await readFromFile(network.name)

        let router_addr = deploy_json[network.name]["ButterRouterV2"]["addr"]

        await hre.run("routerV2:deploySwapAdapter",{});

        deploy_json = await readFromFile(network.name)

        let adapt_addr = deploy_json[network.name]["SwapAdapter"]

        config.v2.executors.push(adapt_addr)

        let executors_s = config.v2.executors.join(",");

        await hre.run("routerV2:setAuthorization",{router:router_addr, executors:executors_s})

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
        if(chainId === 324 || chainId === 280) {
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

        if (!deploy[network.name]["ButterRouterV2"]) {
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
        if(chainId === 324 || chainId === 280) {
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

task("routerV2:setAuthFromConfig", "set Authorization from config file")
    .addOptionalParam("router", "router address", "router", types.string)
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("\nset Authorization from config file deployer :", deployer);

        let config = getConfig(network.name);
        if (!config) {
            throw("config not set");
        }

        let deploy_json = await readFromFile(network.name)

        let router_addr = taskArgs.router;
        if (router_addr === "router") {
            if ( deploy_json[network.name]["ButterRouterV2"] === undefined) {
                throw("can not get router address");
            }
            router_addr = deploy_json[network.name]["ButterRouterV2"]["addr"]
        }
        console.log("router: ", router_addr);

        let adapter_address =  deploy_json[network.name]["SwapAdapter"]
        if (adapter_address != undefined) {
            console.log("SwapAdapter: ", adapter_address);
            config.v2.executors.push(adapter_address);
        }

        let Router = await ethers.getContractFactory("ButterRouterV2");
        let router = Router.attach(router_addr);

        let executors = [];
        for (let i = 0; i < config.v2.executors.length; i++) {
            let result = await (await router.approved(config.v2.executors[i]));

            if (result === false || result === undefined) {
                executors.push(config.v2.executors[i]);
            }
        }

        if (executors.length > 0) {
            let executors_s = executors.join(",");

            console.log("routers to set :", executors_s);

            await setAuthorization(router_addr, executors_s, true);
        }

        console.log("RouterV2 sync authorization from config file.");
    });
