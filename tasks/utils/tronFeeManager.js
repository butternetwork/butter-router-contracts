const { BigNumber } = require("ethers");
let { readFromFile, writeToFile } = require("../../utils/create.js");
let { deploy_contract, getTronWeb } = require("./tronUtils.js");

exports.deployFeeManager = async function (artifacts, network) {
    let tronWeb = await getTronWeb(network);
    console.log("deployer :", tronWeb.defaultAddress);

    let deployer = tronWeb.defaultAddress.hex.replace(/^(41)/, "0x");

    let feeManager = await deploy_contract(artifacts, "IntegratorManager", [deployer], tronWeb);
    console.log("IntegratorManager address :", feeManager);
    let deploy = await readFromFile(network);
    deploy[network]["IntegratorManager"] = feeManager;
    await writeToFile(deploy);
    return feeManager;
};

exports.initialFeeStruct = async function (
    artifacts,
    network,
    receiver,
    fixedNative,
    tokenFeeRate,
    share,
    routerNativeShare
) {
    let tronWeb = await getTronWeb(network);
    let deployer = "0x" + tronWeb.defaultAddress.hex.substring(2);
    console.log("deployer :", tronWeb.address.fromHex(deployer));
    let deploy = await readFromFile(network);
    if (!deploy[network]["FeeManager"]) {
        throw "FeeManager not deploy";
    }
    let FeeManager = await artifacts.readArtifact("FeeManager");
    let address = deploy[network]["FeeManager"];
    if (address.startsWith("0x")) {
        address = tronWeb.address.fromHex(address);
    }
    let feeManager = await tronWeb.contract(FeeManager.abi, address);
    let result = await feeManager.setRouterFee(receiver, fixedNative, tokenFeeRate, share, routerNativeShare).send();
    console.log(result);
};

exports.setIntegratorFee = async function (
    artifacts,
    network,
    integrator,
    openliqReceiver,
    fixedNative,
    tokenFeeRate,
    share,
    routerNativeShare
) {
    let tronWeb = await getTronWeb(network);
    let deployer = "0x" + tronWeb.defaultAddress.hex.substring(2);
    console.log("deployer :", tronWeb.address.fromHex(deployer));
    let deploy = await readFromFile(network);
    if (!deploy[network]["FeeManager"]) {
        throw "FeeManager not deploy";
    }
    let FeeManager = await artifacts.readArtifact("FeeManager");
    let address = deploy[network]["FeeManager"];
    if (address.startsWith("0x")) {
        address = tronWeb.address.fromHex(address);
    }
    let feeManager = await tronWeb.contract(FeeManager.abi, address);
    let result = await feeManager
        .setIntegratorFee(integrator, openliqReceiver, fixedNative, tokenFeeRate, share, routerNativeShare)
        .send();
    console.log(result);
};
