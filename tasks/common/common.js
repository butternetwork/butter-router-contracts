let { getTronContract, getTronDeployer } = require("../../utils/create.js");
let { tronAddressToHex, getDeployment, hexToTronAddress } = require("../../utils/helper.js")

exports.setAuthorization = async function (contractName, artifacts, network, addr, list, flag) {
    if (network === "Tron" || network === "TronTest") {
        console.log("deployer :", await getTronDeployer(false, network));
        let c = await getTronContract(contractName, artifacts, network, addr);
        await c.setAuthorization(list, flag).send() 
    } else {
        let C = await ethers.getContractFactory(contractName);
        let c = C.attach(addr);
        let result = await (await c.setAuthorization(list, flag)).wait();
        if (result.status === 1) {
            console.log(`${contractName} ${addr} setAuthorization ${list} succeed`);
        } else {
            console.log("setAuthorization failed");
        }
    }
};

exports.setBridge = async function (contractName, artifacts, network, addr, bridge) {
    if (network === "Tron" || network === "TronTest") {
        console.log("deployer :", await getTronDeployer(false, network));
        let c = await getTronContract(contractName, artifacts, network, addr);
        await c.setBridgeAddress(tronAddressToHex(bridge)).send() 
    } else {
        let C = await ethers.getContractFactory(contractName);
        let c = C.attach(addr);
        let result = await (await c.setBridgeAddress(bridge)).wait();
        if (result.status == 1) {
            console.log(`${contractName} ${addr} setBridgeAddress ${bridge} succeed`);
        } else {
            console.log("setBridgeAddress failed");
        }
    }
};


exports.setOwner = async function (contractName, artifacts, network, addr, owner) {
    if (network === "Tron" || network === "TronTest") {
        console.log("deployer :", await getTronDeployer(false, network));
        let c = await getTronContract(contractName, artifacts, network, addr);
        await c.transferOwnership(tronAddressToHex(owner)).send() 
    } else {
        let C = await ethers.getContractFactory(contractName);
        let c = C.attach(addr);
        let result = await (await c.transferOwnership(owner)).wait();
        if (result.status == 1) {
            console.log(`${contractName} ${addr} setOwner ${bridge} succeed`);
        } else {
            console.log("setOwner failed");
        }
    }
};


exports.acceptOwnership = async function (contractName, artifacts, network, addr) {
    if (network === "Tron" || network === "TronTest") {
        console.log("deployer :", await getTronDeployer(false, network));
        let c = await getTronContract(contractName, artifacts, network, addr);
        await c.acceptOwnership().send() 
    } else {
        let C = await ethers.getContractFactory(contractName);
        let c = C.attach(addr);
        let result = await (await c.acceptOwnership()).wait();
        if (result.status == 1) {
            console.log(`${contractName} ${addr} acceptOwnership succeed`);
        } else {
            console.log("acceptOwnership failed");
        }
    }
};

exports.checkAuthorization = async function (contractName, artifacts, network, addr, list) {
    let adapter_address = await getDeployment(network, "SwapAdapterV3");
    if (adapter_address != undefined) {
        console.log("SwapAdapter: ", adapter_address);
        list.push(adapter_address);
    } 
    let executors = [];
    if (network === "Tron" || network === "TronTest") {
        console.log("deployer :", await getTronDeployer(false, network));
        let c = await getTronContract(contractName, artifacts, network, addr);
        for (let index = 0; index < list.length; index++) {
            let e = tronAddressToHex(list[index]);
            let result = await c.approved(e).call();
            if (result === false || result === undefined) {
                executors.push(e);
            }
        }
        if (executors.length != 0) {
            await c.setAuthorization(executors, true).send();
        }
        console.log(`${contractName} ${addr} setAuthorization ${list} succeed`);
    } else {
        let C = await ethers.getContractFactory(contractName);
        let c = C.attach(addr);
        for (let index = 0; index < list.length; index++) {
            let result = await c.approved(list[index]);
            if (result === false || result === undefined) {
                executors.push(list[index]);
            }
        }
        if(executors.length != 0){
            let result = await (await c.setAuthorization(executors, true)).wait();
            if (result.status == 1) {
                console.log(`${contractName} ${addr} setAuthorization ${list} succeed`);
            } else {
                console.log("setAuthorization failed");
            }
        }
    }
};

exports.checkBridgeAndWToken = async function (contractName, artifacts, network, addr, config) {
    if (network === "Tron" || network === "TronTest") {
        console.log("deployer :", await getTronDeployer(false, network));
        let c = await getTronContract(contractName, artifacts, network, addr);
        let wToken = hexToTronAddress(await c.wToken().call());
        console.log("pre wToken", wToken);
        if (wToken.toLowerCase() !== config.wToken.toLowerCase()) {
            await c.setWToken(tronAddressToHex(config.wToken)).send();
            console.log("wToken", hexToTronAddress(await c.wToken().call()));
        }
        let bridgeAddress = hexToTronAddress(await c.bridgeAddress().call());
        console.log("pre bridgeAddress", bridgeAddress);
        if (bridgeAddress.toLowerCase() !== config.v3.bridge.toLowerCase()) {
            await c.setBridgeAddress(tronAddressToHex(config.v3.bridge)).send();
            console.log("bridgeAddress", hexToTronAddress(await router.bridgeAddress().call()));
        }
    } else {
        let C = await ethers.getContractFactory(contractName);
        let c = C.attach(addr);
        let wToken = await c.wToken();
        console.log("pre wToken", wToken);
        if (wToken.toLowerCase() !== config.wToken.toLowerCase()) {
            await (await c.setWToken(config.wToken)).wait();
            console.log("wToken", await c.wToken());
        }
        let bridgeAddress = await c.bridgeAddress();
        console.log("pre bridgeAddress", bridgeAddress);
        if (bridgeAddress.toLowerCase() !== config.v3.bridge.toLowerCase()) {
            await (await c.setBridgeAddress(config.v3.bridge)).wait();
            console.log("bridgeAddress", await c.bridgeAddress());
        }
    }
};

exports.removeAuthFromConfig = async function (contractName, artifacts, network, addr, list) {
    let executors = [];
    if (network === "Tron" || network === "TronTest") {
        console.log("deployer :", await getTronDeployer(false, network));
        let c = await getTronContract(contractName, artifacts, network, addr);
        for (let index = 0; index < list.length; index++) {
            let e = tronAddressToHex(list[index]);
            let result = await c.approved(e).call();
            if (result === true) {
                executors.push(e);
            }
        }
        if (executors.length != 0) {
            await c.setAuthorization(executors, false).send();
        }
        console.log(`${contractName} ${addr} removeAuthorization ${list} succeed`);
    } else {
        let C = await ethers.getContractFactory(contractName);
        let c = C.attach(addr);
        for (let index = 0; index < list.length; index++) {
            let result = await c.approved(list[index]);
            if (result === true) {
                executors.push(list[index]);
            }
        }
        if(executors.length != 0){
            let result = await (await c.setAuthorization(executors, false)).wait();
            if (result.status == 1) {
                console.log(`${contractName} ${addr} removeAuthorization ${list} succeed`);
            } else {
                console.log("removeAuthorization failed");
            }
        }
    }
};


exports.checkFee = async function (contractName, artifacts, network, addr, config) {
    if (network === "Tron" || network === "TronTest") {
        console.log("deployer :", await getTronDeployer(false, network));
        let c = await getTronContract(contractName, artifacts, network, addr);
        let feeReceiver = "0x" + (await c.feeReceiver().call()).substring(2);
        console.log("pre feeReceiver", hexToTronAddress(feeReceiver));
        let routerFixedFee = await c.routerFixedFee().call();
        console.log("pre routerFixedFee", routerFixedFee);
    
        let routerFeeRate = await c.routerFeeRate().call();
        console.log("pre routerFeeRate", routerFeeRate);
    
        let hexReceiver = tronAddressToHex(config.v3.fee.receiver);
        if (
            feeReceiver.toLowerCase() !== hexReceiver.toLowerCase() ||
            routerFixedFee.toString() !== config.v3.fee.routerFixedFee ||
            routerFeeRate.toString() !== config.v3.fee.routerFeeRate
        ) {
            await c.setFee(hexReceiver, config.v3.fee.routerFeeRate, config.v3.fee.routerFixedFee).send();
            console.log("feeReceiver", hexToTronAddress(await c.feeReceiver().call()));
            console.log("routerFixedFee", await c.routerFixedFee().call());
            console.log("routerFeeRate", await c.routerFeeRate().call());
        }
        let maxFeeRate = await c.maxFeeRate().call();
        let maxNativeFee = await c.maxNativeFee().call();
        console.log("pre maxFeeRate", maxFeeRate);
        console.log("pre maxNativeFee", maxNativeFee);
        if (
            maxFeeRate.toString() !== config.v3.fee.maxReferrerFeeRate ||
            maxNativeFee.toString() !== config.v3.fee.maxReferrerNativeFee
        ) {
            await c.setReferrerMaxFee(config.v3.fee.maxReferrerFeeRate, config.v3.fee.maxReferrerNativeFee).send();
            console.log("maxFeeRate", await c.maxFeeRate().call());
            console.log("maxNativeFee", await c.maxNativeFee().call());
        }
    } else {
        let C = await ethers.getContractFactory(contractName);
        let c = C.attach(addr);
        let feeReceiver = await c.feeReceiver();
        let routerFixedFee = await c.routerFixedFee();
        let routerFeeRate = await c.routerFeeRate();

        console.log("pre feeReceiver", feeReceiver);
        console.log("pre routerFixedFee", routerFixedFee);
        console.log("pre routerFeeRate", routerFeeRate);

        if (
            feeReceiver.toLowerCase() !== config.v3.fee.receiver.toLowerCase() ||
            routerFixedFee.toString() !== config.v3.fee.routerFixedFee ||
            routerFeeRate.toString() !== config.v3.fee.routerFeeRate
        ) {
            await (
                await c.setFee(config.v3.fee.receiver, config.v3.fee.routerFeeRate, config.v3.fee.routerFixedFee)
            ).wait();

            console.log("feeReceiver", await c.feeReceiver());
            console.log("routerFixedFee", await c.routerFixedFee());
            console.log("routerFeeRate", await c.routerFeeRate());
        }
        let maxFeeRate = await c.maxFeeRate();
        let maxNativeFee = await c.maxNativeFee();
        console.log("pre maxFeeRate", maxFeeRate);
        console.log("pre maxNativeFee", maxNativeFee);
        if (
            maxFeeRate.toString() !== config.v3.fee.maxReferrerFeeRate ||
            maxNativeFee.toString() !== config.v3.fee.maxReferrerNativeFee
        ) {
            await (
                await c.setReferrerMaxFee(config.v3.fee.maxReferrerFeeRate, config.v3.fee.maxReferrerNativeFee)
            ).wait();
            console.log("maxFeeRate", await c.maxFeeRate());
            console.log("maxNativeFee", await c.maxNativeFee());
        }
    }
};

exports.getExecutorList = async function (network, executors) {
    let list = executors.split(",");
    if (list.length < 1) {
        console.log("executors is empty ...");
        return;
    }
    if(network === "Tron" || network === "TronTest") {
        for (let index = 0; index < list.length; index++) {
            list[index] = tronAddressToHex(list[index]);
        }
    }
    return list;
};


