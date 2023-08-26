// const hre = require("hardhat");


exports.setMos = async function (router_addr,mos) {

    let Router = await ethers.getContractFactory("ButterRouter");

    let router = Router.attach(router_addr);

    let result = await (await router.setMosAddress(mos)).wait();

    if (result.status == 1) {
        console.log('setMos succeed');
        console.log("new mos address is:", await router.mosAddress());
    } else {
        console.log('create failed');
    }
}



exports.setAuthorization = async function (router_addr, executors_s, flag) {

    let executors = executors_s.split(',');

    if (executors.length < 1){
        console.log("executors is empty ...");
        return;
    }

    let Router = await ethers.getContractFactory("ButterRouterV2");

    let router = Router.attach(router_addr);

    let result = await (await router.setAuthorization(executors, flag)).wait();

    if (result.status == 1) {
        console.log(`Router ${router.address} setAuthorization ${executors} succeed`);
    } else {
        console.log('setAuthorization failed');
    }
}


exports.setFee = async function (router_addr,feereceiver,feerate,fixedfee) {

    let Router = await ethers.getContractFactory("ButterRouterV2");

    let router = Router.attach(router_addr);

    let result = await (await router.setFee(feereceiver,feerate,fixedfee)).wait();

    if (result.status == 1) {
        console.log(`Router ${router_addr} setFee rate(${feerate}), fixed(${fixedfee}), receiver(${feereceiver}) succeed`);
    } else {
        console.log('setFee failed');
    }
}