const { verify } = require("@mapprotocol/common-contracts/utils/verifier");

task("verifyContract", "Verify contract on explorer (EVM and Tron)")
    .addParam("contract", "Contract name (e.g. ButterRouterV4)")
    .addParam("address", "Deployed contract address")
    .addOptionalParam("args", "Constructor args as JSON array", "[]", types.string)
    .addOptionalParam("params", "Pre-encoded constructor params hex (no 0x prefix)", "", types.string)
    .setAction(async (taskArgs, hre) => {
        let constructorArgs = [];
        try { constructorArgs = JSON.parse(taskArgs.args); } catch {}

        await verify(hre, {
            contractName: taskArgs.contract,
            address: taskArgs.address,
            constructorArgs: constructorArgs.length > 0 ? constructorArgs : undefined,
            constructorParams: taskArgs.params || undefined,
        });
    });
