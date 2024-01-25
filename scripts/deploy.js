// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

let mos_addr = "";

let wtoken = "";

async function main() {
    let [wallet] = await ethers.getSigners();
    console.log(wallet.address);
    const Router = await hre.ethers.getContractFactory("ButterRouterV2");
    const router = await Router.deploy(mos_addr, wallet.address, wtoken);
    await router.deployed();
    console.log(`router deployed to ${router.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
