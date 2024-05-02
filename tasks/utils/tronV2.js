let { readFromFile, writeToFile } = require("../../utils/create.js");
let { getTronWeb, deploy_contract, setAuthorization, setFee } = require("./tronUtils.js");

exports.routerV2 = async function (artifacts, network, config) {
    let tronWeb = await getTronWeb(network);
    let router = await deployRouterV2(artifacts, network, config.v2.mos, config.wToken);
    let adapt = await deploySwapAdapter(artifacts, network);
    config.v2.executors.push(adapt);
    let executors_s = config.v2.executors.join(",");
    await setAuthorization(tronWeb, artifacts, network, router, executors_s, true);
    await setFee(
        tronWeb,
        artifacts,
        network,
        router,
        config.v2.fee.receiver,
        config.v2.fee.feeRate,
        config.v2.fee.fixedFee
    );
};

exports.deployFeeReceiver = async function (artifacts, network, payees, shares) {
    let tronWeb = await getTronWeb(network);
    let deployer = "0x" + tronWeb.defaultAddress.hex.substring(2);
    console.log("deployer :", tronWeb.address.fromHex(deployer));
    let feeReveiver = await deploy_contract(artifacts, "FeeReceiver", [payees, shares, deployer], tronWeb);
    console.log("FeeReceiver address :", feeReveiver);
    let deploy = await readFromFile(network);
    deploy[network]["FeeReceiver"] = feeReveiver;
    await writeToFile(deploy);
};

exports.deployRouterV2 = async function (artifacts, network, mos, wtoken) {
    await deployRouterV2(artifacts, network, mos, wtoken);
};

exports.deploySwapAdapter = async function (artifacts, network) {
    await deploySwapAdapter(artifacts, network);
};

exports.tronSetAuthorization = async function (artifacts, network, router_addr, executors, flag) {
    let tronWeb = await getTronWeb(network);
    await setAuthorization(tronWeb, artifacts, network, router_addr, executors, flag);
};
exports.tronSetFee = async function (artifacts, network, router_addr, feereceiver, feerate, fixedfee) {
    let tronWeb = await getTronWeb(network);
    await setFee(tronWeb, artifacts, network, router_addr, feereceiver, feerate, fixedfee);
};

async function deployRouterV2(artifacts, network, mos, wtoken) {
    let tronWeb = await getTronWeb(network);
    console.log("deploy router v2 ...");
    console.log("deployer :", tronWeb.defaultAddress);

    let deployer = tronWeb.defaultAddress.hex.replace(/^(41)/, "0x");
    let mosHex = tronWeb.address.toHex(mos).replace(/^(41)/, "0x");
    let wtokenHex = tronWeb.address.toHex(wtoken).replace(/^(41)/, "0x");

    let routerV2 = await deploy_contract(artifacts, "ButterRouterV2", [mosHex, deployer, wtokenHex], tronWeb);
    console.log("router v2 address :", routerV2);

    let deploy = await readFromFile(network);
    if (!deploy[network]["ButterRouterV2"]) {
        deploy[network]["ButterRouterV2"] = {};
    }
    deploy[network]["ButterRouterV2"]["addr"] = routerV2;
    await writeToFile(deploy);

    return routerV2;
}

async function deploySwapAdapter(artifacts, network) {
    console.log("deploy swap adapter ...");

    let tronWeb = await getTronWeb(network);
    let deployer = tronWeb.defaultAddress.base58;
    console.log("deployer :", deployer);
    let adapt = await deploy_contract(artifacts, "SwapAdapter", [deployer], tronWeb);
    console.log("SwapAdapter address :", adapt);
    let deploy = await readFromFile(network);
    deploy[network]["SwapAdapter"] = adapt;
    await writeToFile(deploy);
    return adapt;
}

exports.tronSetAuthFromConfig = async function (artifacts, network, router_addr, config) {
    let deploy_json = await readFromFile(network);
    if (router_addr === "router") {
        if (deploy_json[network]["ButterRouterV2"] === undefined) {
            throw "can not get router address";
        }
        router_addr = deploy_json[network]["ButterRouterV2"]["addr"];
    }
    console.log("router: ", router_addr);

    let adapter_address = deploy_json[network]["SwapAdapter"];
    if (adapter_address != undefined) {
        console.log("SwapAdapter: ", adapter_address);
        config.v2.executors.push(adapter_address);
    }
    let tronWeb = await getTronWeb(network);
    let Router = await artifacts.readArtifact("ButterRouterV2");
    if (router_addr.startsWith("0x")) {
        router_addr = tronWeb.address.fromHex(router_addr);
    }
    let router = await tronWeb.contract(Router.abi, router_addr);
    let executors = [];
    for (let i = 0; i < config.v2.executors.length; i++) {
        let result = await await router.approved(config.v2.executors[i]).call();

        if (result === false || result === undefined) {
            executors.push(config.v2.executors[i]);
        }
    }
    if (executors.length > 0) {
        let executors_s = executors.join(",");

        console.log("routers to set :", executors_s);

        await setAuthorization(tronWeb, artifacts, network, router_addr, executors_s, true);
    }
    console.log("RouterV2 sync authorization from config file.");
};
