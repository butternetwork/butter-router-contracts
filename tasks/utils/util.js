// const hre = require("hardhat");

exports.setMos = async function (router_addr, mos) {
    let Router = await ethers.getContractFactory("ButterRouter");

    let router = Router.attach(router_addr);

    let result = await (await router.setMosAddress(mos)).wait();

    if (result.status == 1) {
        console.log("setMos succeed");
        console.log("new mos address is:", await router.mosAddress());
    } else {
        console.log("create failed");
    }
};

exports.setAuthorizationV2 = async function (router_addr, executors_s, flag) {
    await setAuthorization("ButterRouterV2",router_addr, executors_s, flag)
};

exports.setAuthorizationV3 = async function (router_addr, executors_s, flag) {
    await setAuthorization("ButterRouterV3",router_addr, executors_s, flag)
};

async function setAuthorization(contractName,router_addr, executors_s, flag) {
    let executors = executors_s.split(",");

    if (executors.length < 1) {
        console.log("executors is empty ...");
        return;
    }

    let Router = await ethers.getContractFactory(contractName);

    let router = Router.attach(router_addr);

    let result = await (await router.setAuthorization(executors, flag)).wait();

    if (result.status == 1) {
        console.log(`${contractName} ${router.address} setAuthorization ${executors} succeed`);
    } else {
        console.log("setAuthorization failed");
    }
}

exports.setFeeV2 = async function (router_addr, feereceiver, feerate, fixedfee) {
      await setFee("ButterRouterV2",router_addr, feereceiver, feerate, fixedfee)
}

exports.setFeeV3 = async function (router_addr, feereceiver, feerate, fixedfee) {
    await setFee("ButterRouterV3",router_addr, feereceiver, feerate, fixedfee)
}

async function setFee(contractName,router_addr, feereceiver, feerate, fixedfee) {
    let Router = await ethers.getContractFactory(contractName);

    let router = Router.attach(router_addr);

    let result = await (await router.setFee(feereceiver, feerate, fixedfee)).wait();

    if (result.status == 1) {
        console.log(
            `${contractName} ${router_addr} setFee rate(${feerate}), fixed(${fixedfee}), receiver(${feereceiver}) succeed`
        );
    } else {
        console.log("setFee failed");
    }
};

exports.transferOwner = async function (router_addr, owner) {
    // let OwnableContract = await ethers.getContractAt("Ownable2Step", router_addr);

    let ownable = await ethers.getContractAt("Ownable2Step", router_addr);

    let result = await (await ownable.transferOwnership(owner)).wait();

    if (result.status == 1) {
        console.log(`Router ${router_addr} transferOwnership ${owner} succeed`);
    } else {
        console.log("transferOwnership failed");
    }
};

exports.acceptOwner = async function (router_addr) {
    let Router = await ethers.getContractFactory("Ownable2Step");

    let router = Router.attach(router_addr);

    let result = await (await router.acceptOwnership()).wait();

    if (result.status == 1) {
        console.log(`Router ${router_addr} acceptOwnership succeed`);
    } else {
        console.log("acceptOwnership failed");
    }
};


