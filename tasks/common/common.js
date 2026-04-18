const {
    getContract, isTronNetwork, tronToHex, tronFromHex,
} = require("../utils/helper.js");

/**
 * Set executor authorization. Compares on-chain state first, only sends tx for changes.
 * @param {object} hre - hardhat runtime environment
 * @param {string} contractName - contract name (e.g. "ButterRouterV4")
 * @param {string} addr - contract address
 * @param {string[]} executors - executor addresses
 * @param {boolean} flag - true to authorize, false to revoke
 */
exports.setAuthorization = async function (hre, contractName, addr, executors, flag = true) {
    let c = await getContract(contractName, hre, addr);

    if (isTronNetwork(hre.network.name)) {
        let list = executors.map(e => tronToHex(e));
        let toUpdate = [];
        for (let a of list) {
            let approved = await c.approved(a).call();
            if (Boolean(approved) !== flag) toUpdate.push(a);
        }
        if (toUpdate.length === 0) {
            console.log(`${contractName} ${addr} authorization already up-to-date`);
            return;
        }
        await c.setAuthorization(toUpdate, flag).sendAndWait();
        console.log(`${contractName} ${addr} setAuthorization [${toUpdate.length}/${list.length} changed]`);
    } else {
        let toUpdate = [];
        for (let a of executors) {
            let approved = await c.approved(a);
            if (Boolean(approved) !== flag) toUpdate.push(a);
        }
        if (toUpdate.length === 0) {
            console.log(`${contractName} ${addr} authorization already up-to-date`);
            return;
        }
        await (await c.setAuthorization(toUpdate, flag)).wait();
        console.log(`${contractName} ${addr} setAuthorization [${toUpdate.length}/${executors.length} changed]`);
    }
};

/**
 * Set bridge address. Compares on-chain state first.
 */
exports.setBridge = async function (hre, contractName, addr, bridge) {
    let c = await getContract(contractName, hre, addr);

    if (isTronNetwork(hre.network.name)) {
        let bridgeHex = tronToHex(bridge);
        let current = tronToHex(await c.bridgeAddress().call());
        if (current.toLowerCase() === bridgeHex.toLowerCase()) {
            console.log(`${contractName} ${addr} bridge already set`);
            return;
        }
        await c.setBridgeAddress(bridgeHex).sendAndWait();
    } else {
        let current = await c.bridgeAddress();
        if (current.toLowerCase() === bridge.toLowerCase()) {
            console.log(`${contractName} ${addr} bridge already set`);
            return;
        }
        await (await c.setBridgeAddress(bridge)).wait();
    }
    console.log(`${contractName} ${addr} setBridgeAddress ${bridge}`);
};

/**
 * Transfer ownership. Compares on-chain state first.
 */
exports.setOwner = async function (hre, contractName, addr, owner) {
    let c = await getContract(contractName, hre, addr);

    if (isTronNetwork(hre.network.name)) {
        let ownerHex = tronToHex(owner);
        let current = tronToHex(await c.owner().call());
        if (current.toLowerCase() === ownerHex.toLowerCase()) {
            console.log(`${contractName} ${addr} owner already ${owner}`);
            return;
        }
        await c.transferOwnership(ownerHex).sendAndWait();
    } else {
        let current = await c.owner();
        if (current.toLowerCase() === owner.toLowerCase()) {
            console.log(`${contractName} ${addr} owner already ${owner}`);
            return;
        }
        await (await c.transferOwnership(owner)).wait();
    }
    console.log(`${contractName} ${addr} transferOwnership ${owner}`);
};

/**
 * Accept pending ownership transfer.
 */
exports.acceptOwnership = async function (hre, contractName, addr) {
    let c = await getContract(contractName, hre, addr);

    if (isTronNetwork(hre.network.name)) {
        await c.acceptOwnership().sendAndWait();
    } else {
        await (await c.acceptOwnership()).wait();
    }
    console.log(`${contractName} ${addr} acceptOwnership succeed`);
};

/**
 * Remove deprecated authorizations. Checks on-chain state first.
 */
exports.removeAuth = async function (hre, contractName, addr, removes) {
    if (!removes || removes.length === 0) {
        console.log("no removes list");
        return;
    }
    let c = await getContract(contractName, hre, addr);
    let toRemove = [];

    if (isTronNetwork(hre.network.name)) {
        for (let exec of removes) {
            let a = tronToHex(exec);
            if (await c.approved(a).call()) toRemove.push(a);
        }
        if (toRemove.length > 0) {
            await c.setAuthorization(toRemove, false).sendAndWait();
        }
    } else {
        for (let exec of removes) {
            if (await c.approved(exec)) toRemove.push(exec);
        }
        if (toRemove.length > 0) {
            await (await c.setAuthorization(toRemove, false)).wait();
        }
    }
    console.log(`${contractName} removed ${toRemove.length} authorizations`);
};

/**
 * Check and update fee settings from config. Compares on-chain state first.
 */
exports.checkFee = async function (hre, contractName, addr, feeConfig) {
    let c = await getContract(contractName, hre, addr);

    if (isTronNetwork(hre.network.name)) {
        let currentReceiver = tronToHex(await c.feeReceiver().call());
        let currentRate = await c.routerFeeRate().call();
        let currentFixed = await c.routerFixedFee().call();
        let expectedReceiver = tronToHex(feeConfig.receiver);

        if (
            currentReceiver.toLowerCase() !== expectedReceiver.toLowerCase() ||
            currentRate.toString() !== feeConfig.routerFeeRate ||
            currentFixed.toString() !== feeConfig.routerFixedFee
        ) {
            await c.setFee(expectedReceiver, feeConfig.routerFeeRate, feeConfig.routerFixedFee).sendAndWait();
            console.log(`${contractName} ${addr} fee updated`);
        } else {
            console.log(`${contractName} ${addr} fee already up-to-date`);
        }

        let maxFeeRate = await c.maxFeeRate().call();
        let maxNativeFee = await c.maxNativeFee().call();
        if (
            maxFeeRate.toString() !== feeConfig.maxReferrerFeeRate ||
            maxNativeFee.toString() !== feeConfig.maxReferrerNativeFee
        ) {
            await c.setReferrerMaxFee(feeConfig.maxReferrerFeeRate, feeConfig.maxReferrerNativeFee).sendAndWait();
            console.log(`${contractName} ${addr} referrerMaxFee updated`);
        } else {
            console.log(`${contractName} ${addr} referrerMaxFee already up-to-date`);
        }
    } else {
        let currentReceiver = await c.feeReceiver();
        let currentRate = await c.routerFeeRate();
        let currentFixed = await c.routerFixedFee();

        if (
            currentReceiver.toLowerCase() !== feeConfig.receiver.toLowerCase() ||
            currentRate.toString() !== feeConfig.routerFeeRate ||
            currentFixed.toString() !== feeConfig.routerFixedFee
        ) {
            await (await c.setFee(feeConfig.receiver, feeConfig.routerFeeRate, feeConfig.routerFixedFee)).wait();
            console.log(`${contractName} ${addr} fee updated`);
        } else {
            console.log(`${contractName} ${addr} fee already up-to-date`);
        }

        let maxFeeRate = await c.maxFeeRate();
        let maxNativeFee = await c.maxNativeFee();
        if (
            maxFeeRate.toString() !== feeConfig.maxReferrerFeeRate ||
            maxNativeFee.toString() !== feeConfig.maxReferrerNativeFee
        ) {
            await (await c.setReferrerMaxFee(feeConfig.maxReferrerFeeRate, feeConfig.maxReferrerNativeFee)).wait();
            console.log(`${contractName} ${addr} referrerMaxFee updated`);
        } else {
            console.log(`${contractName} ${addr} referrerMaxFee already up-to-date`);
        }
    }
};
