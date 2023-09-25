let {readFromFile,writeToFile} = require("../../utils/create.js")
let {getTronWeb,
    deploy_contract,
    setAuthorization,
    setFee} = require("./tronUtils.js");



exports.routerPlus = async function(artifacts,network,config) {
    let tronWeb = await getTronWeb(network);
    let router = await deployRouterPlus(artifacts,network,config.wToken);
    let proxy = await deployTransferProxy(artifacts,network);
    config.plus.executors.push(proxy)
    let executors_s = config.plus.executors.join(",");
    await setAuthorization(tronWeb,artifacts,network,router,executors_s,true);
    await setFee(tronWeb,artifacts,network,router,config.plus.fee.receiver,config.plus.fee.feeRate,config.plus.fee.fixedFee);
}

exports.deployRouterPlus = async function(artifacts,network,wtoken){
    await deployRouterPlus(artifacts,network,wtoken);
}

exports.deployTransferProxy = async function(artifacts,network){
    await deployTransferProxy(artifacts,network);
}
  
exports.tronSetAuthorization = async function(artifacts,network,router_addr,executors,flag){
    let tronWeb = await getTronWeb(network);
    await setAuthorization(tronWeb,artifacts,network,router_addr,executors,flag);
}
exports.tronSetFee = async function(artifacts,network,router_addr,feereceiver,feerate,fixedfee){
    let tronWeb = await getTronWeb(network);
    await setFee(tronWeb,artifacts,network,router_addr,feereceiver,feerate,fixedfee);
}

exports.deployFeeReceiver = async function(artifacts,network,payees,shares){
    let tronWeb = await getTronWeb(network);
    let deployer = '0x' + tronWeb.defaultAddress.hex.substring(2);
    console.log("deployer :",tronWeb.address.fromHex(deployer));
    let feeReveiver = await deploy_contract(artifacts,"FeeReceiver",[payees,shares,deployer],tronWeb);
    console.log("FeeReceiver address :",feeReveiver);
    let deploy = await readFromFile(network);
    deploy[network]["FeeReceiver"] = feeReveiver;
    await writeToFile(deploy);
}

exports.tronSetAuthFromConfig = async function(artifacts,network,router_addr,config){
    let deploy_json = await readFromFile(network)
    if (router_addr === "router") {
        if (deploy_json[network]["ButterRouterPlus"] === undefined) {
            throw("can not get router address");
        }
        router_addr = deploy_json[network]["ButterRouterPlus"]["addr"]
    }
    console.log("router: ", router_addr);

    let proxy_addr =  deploy_json[network]["TransferProxy"]
    if (proxy_addr != undefined) {
        console.log("proxy: ", proxy_addr);
        config.plus.executors.push(proxy_addr);
    }
    if (deploy_json[network]["ButterRouterV2"] != undefined) {
        let butter_addr =  deploy_json[network]["ButterRouterV2"]["addr"];
        console.log("ButterRouterV2: ", butter_addr);
        config.plus.executors.push(butter_addr);
    }
    let tronWeb = await getTronWeb(network);
    let Router = await artifacts.readArtifact("ButterRouterV2");
    if(router_addr.startsWith("0x")){
      router_addr = tronWeb.address.fromHex(router_addr)
    }
    let router = await tronWeb.contract(Router.abi,router_addr);
    let executors = [];
    for (let i = 0; i < config.plus.executors.length; i++) {
        let result = await (await router.approved(config.plus.executors[i]).call());
        if (result === false || result === undefined) {
            executors.push(config.plus.executors[i]);
        }
    }
    if (executors.length > 0) {
        let executors_s = executors.join(",");

        console.log("routers to set :", executors_s);

        await setAuthorization(tronWeb,artifacts,network,router_addr, executors_s, true);
    }
    console.log("RouterPlus sync authorization from config file.");
}

async function deployRouterPlus(artifacts,network,wtoken){
    let tronWeb = await getTronWeb(network);
    let deployer = '0x' + tronWeb.defaultAddress.hex.substring(2);
    console.log("deployer :",tronWeb.address.fromHex(deployer));
    let plus =  await deploy_contract(artifacts,"ButterRouterPlus",[deployer,wtoken],tronWeb);
    console.log("router plus address :",plus);
    let deploy = await readFromFile(network);
    if(!deploy[network]["ButterRouterPlus"]){
        deploy[network]["ButterRouterPlus"] = {}
    }
    deploy[network]["ButterRouterPlus"]["addr"] = plus;

    await writeToFile(deploy);

    return plus;
}


async function deployTransferProxy(artifacts,network){
    let tronWeb = await getTronWeb(network);
    let deployer = '0x' + tronWeb.defaultAddress.hex.substring(2);
    console.log("deployer :",tronWeb.address.fromHex(deployer));
    let proxy =  await deploy_contract(artifacts,"TransferProxy",[],tronWeb);
    console.log("TransferProxy address :",proxy); 
    let deploy = await readFromFile(network);
    deploy[network]["TransferProxy"] = proxy;
    await writeToFile(deploy);
    return proxy;
}
