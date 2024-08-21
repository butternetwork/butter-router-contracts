async function sleep(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

exports.verify = async function (hre, addr, args, contract, wait) {
    if (needVerify(hre.network.config.chainId)) {
        if (wait) {
            await sleep(20000);
        }
        console.log(`verify ${contract} ...`);
        console.log("addr:", addr);
        console.log("args:", args);

        const verifyArgs = args.map((arg) => (typeof arg == "string" ? `'${arg}'` : arg)).join(" ");
        console.log(
            `To verify, run: npx hardhat verify --network ${hre.network.name} --contract ${contract} ${addr} ${verifyArgs}`
        );

        await run("verify:verify", {
            contract: contract,
            address: addr,
            constructorArguments: args,
        });
    } else if (needSourcify(hre.network.config.chainId)) {
        await run("sourcify");
    }
};

function needVerify(chainId) {
    let needs = [
        1, // eth
        56, // bsc
        137, // matic
        199, // bttc
        81457, // blast
        8453, // base
        324, // zksync
        10, //op
        42161, // arb
        59144, // linea
        534352, // scoll
        5000, // mantle
    ];
    if (needs.includes(chainId)) {
        return true;
    } else {
        return false;
    }
}

function needSourcify(chainId) {
    let needs = [
        //22776, // mapo
    ];
    if (needs.includes(chainId)) {
        return true;
    } else {
        return false;
    }
}
