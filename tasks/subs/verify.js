const { verify } = require("@mapprotocol/common-contracts/utils/verifier");
const fs = require("fs");
const path = require("path");

task("verifyContract", "Verify contract on explorer (EVM and Tron)")
    .addParam("contract", "Contract name (e.g. ButterRouterV4)")
    .addParam("address", "Deployed contract address")
    .addOptionalParam("args", "Constructor args as JSON array", "[]", types.string)
    .addOptionalParam("params", "Pre-encoded constructor params hex (no 0x prefix)", "", types.string)
    .addFlag("keepFlatten", "Reuse an existing flatten file instead of regenerating it")
    .setAction(async (taskArgs, hre) => {
        let constructorArgs = [];
        try { constructorArgs = JSON.parse(taskArgs.args); } catch {}

        // The verifier reuses verify-output/<Contract>_flatten.sol if it exists, which
        // silently verifies STALE source after the contract changes. Delete it first so a
        // fresh flatten of the current source is generated (pass --keep-flatten to opt out).
        if (!taskArgs.keepFlatten) {
            const flattenPath = path.join(process.cwd(), "verify-output", `${taskArgs.contract}_flatten.sol`);
            if (fs.existsSync(flattenPath)) {
                fs.rmSync(flattenPath);
                console.log(`removed stale flatten: ${flattenPath}`);
            }
        }

        await verify(hre, {
            contractName: taskArgs.contract,
            address: taskArgs.address,
            constructorArgs: constructorArgs.length > 0 ? constructorArgs : undefined,
            constructorParams: taskArgs.params || undefined,
        });
    });
