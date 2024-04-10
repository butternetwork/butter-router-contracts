exports.verify = async function (addr, arg, code, chainId) {
    if (needVerify(chainId)) {
        await run("verify:verify", {
            address: addr,
            constructorArguments: arg,
            contract: code,
        });
    }
};

function needVerify(chainId) {
    let needs = [1, 56, 137, 199, 80001, 81457, 8453];
    if (needs.includes(chainId)) {
        return true;
    } else {
        return false;
    }
}
