const TronWeb = require('tronweb')
require('dotenv').config();






exports.setAuthorization = async function(tronWeb,artifacts,network,router_addr,executors,flag){
  let Router = await artifacts.readArtifact("ButterRouterV2");
  if(router_addr.startsWith("0x")){
    router_addr = tronWeb.address.fromHex(router_addr)
  }
  let router = await tronWeb.contract(Router.abi,router_addr);
  let executorList = executors.split(',');
  if (executorList.length < 1){
      console.log("executors is empty ...");
      return;
  }
  await router.setAuthorization(executorList,flag).send();
  console.log(`Router ${router_addr} setAuthorization ${executorList} succeed`);
}

exports.setFee = async function(tronWeb,artifacts,network,router_addr,feereceiver,feerate,fixedfee){
  let Router = await artifacts.readArtifact("ButterRouterV2");
  if(router_addr.startsWith("0x")){
    router_addr = tronWeb.address.fromHex(router_addr)
  }
  let router = await tronWeb.contract(Router.abi,router_addr);

  await router.setFee(feereceiver,feerate,fixedfee).send();

  console.log(`Router ${router_addr} setFee rate(${feerate}), fixed(${fixedfee}), receiver(${feereceiver}) succeed`);
}


exports.deploy_contract = async function deploy_contract(artifacts,name,args,tronWeb){
    let c = await artifacts.readArtifact(name);
    let contract_instance = await tronWeb.contract().new({
      abi:c.abi,
      bytecode:c.bytecode,
      feeLimit:15000000000,
      callValue:0,
      parameters:args
    });
    console.log(`${name} deployed on: ${contract_instance.address}`);
    
    return '0x' + contract_instance.address.substring(2);
  }

  exports.getTronWeb = async function  (network) {
    if(network === "Tron" || network === "TronTest"){
           
       if(network === "Tron") {
         return new TronWeb(
             "https://api.trongrid.io/",
             "https://api.trongrid.io/",
             "https://api.trongrid.io/",
              process.env.TRON_PRIVATE_KEY
           )
       } else {
         return new TronWeb(
             "https://api.nileex.io/",
             "https://api.nileex.io/",
             "https://api.nileex.io/",
              process.env.TRON_PRIVATE_KEY
           )
       }
 
    } else {
      throw("unsupport network");
    }
  
 }