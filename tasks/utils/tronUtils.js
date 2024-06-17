const TronWeb = require("tronweb");
require("dotenv").config();

exports.deploy_contract = async function deploy_contract(artifacts, name, args, tronWeb) {
    let c = await artifacts.readArtifact(name);
    let contract_instance = await tronWeb.contract().new({
        abi: c.abi,
        bytecode: c.bytecode,
        feeLimit: 15000000000,
        callValue: 0,
        parameters: args,
    });

    let addr = tronWeb.address.fromHex(contract_instance.address);
    console.log(`${name} deployed on: ${addr} ( ${contract_instance.address} )`);

    return addr;
};

exports.getTronWeb = async function (network) {
    if (network === "Tron" || network === "TronTest") {
        if (network === "Tron") {
            return new TronWeb(
                "https://api.trongrid.io/",
                "https://api.trongrid.io/",
                "https://api.trongrid.io/",
                process.env.TRON_PRIVATE_KEY
            );
        } else {
            return new TronWeb(
                "https://api.nileex.io/",
                "https://api.nileex.io/",
                "https://api.nileex.io/",
                process.env.TRON_PRIVATE_KEY
            );
        }
    } else {
        throw "unsupport network";
    }
};
