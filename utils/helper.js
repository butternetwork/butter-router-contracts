
let fs = require("fs");
let path = require("path");
const TronWeb = require("tronweb");


let file_path = "../deployments/"
let fileName = "deploy.json"

function tronAddressToHex(tronAddress) {
    return '0x' + TronWeb.address.toHex(tronAddress).substring(2)
}

function hexToTronAddress(hexAddress) {
    return TronWeb.address.fromHex(hexAddress)
}

async function saveDeployment(network, key1, addr, key2) {
    let deployment = await readFromFile(network);
  
    if (key2 === undefined || key2 === "") {
      deployment[network][key1] = addr;
    } else {
      if (!deployment[hre.network.name][key1]) {
        deployment[hre.network.name][key1] = {};
      }
      deployment[hre.network.name][key1][key2] = addr;
    }
    let p = path.join(__dirname, file_path + fileName);
    await folder(file_path);
    fs.writeFileSync(p, JSON.stringify(deployment, null, "\t"));
  }
  
async function getDeployment(network, key1, key2) {
    let deployment = await readFromFile(network);
    let deployAddress = deployment[network][key1];
    if (!deployAddress) throw `no ${key1} deployment in ${network}`;
    if (key2 === undefined || key2 === "") {
      return deployAddress;
    }
    deployAddress = deployment[network][key1][key2];
    if (!deployAddress) throw `no ${key1[key2]} deployment in ${network}`;
  
    return deployAddress;
  }

async function readFromFile(network) {
    let p = path.join(__dirname, file_path + fileName);
    let deploy;
    if (!fs.existsSync(p)) {
        deploy = {};
        deploy[network] = {};
    } else {
        let rawdata = fs.readFileSync(p);
        deploy = JSON.parse(rawdata);
        if (!deploy[network]) {
            deploy[network] = {};
        }
    }

    return deploy;
}

// async function writeToFile(deploy) {
//     let p = path.join(__dirname, path + fileName);
//     await folder(path);
//     fs.writeFileSync(p, JSON.stringify(deploy, null, "\t"));
// }

const folder = async (reaPath) => {
    const absPath = path.resolve(__dirname, reaPath);
    try {
        await fs.promises.stat(absPath);
    } catch (e) {
        // {recursive: true}
        await fs.promises.mkdir(absPath, { recursive: true });
    }
};

module.exports = {
    saveDeployment,
    getDeployment,
    tronAddressToHex,
    hexToTronAddress,
};