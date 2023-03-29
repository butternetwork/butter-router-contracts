// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

let mos_addr = "0xb4fCfdD492202c91A7eBaf887642F437a07A2664";

let butter_core_addr = "";

async function main() {
  let [wallet] = await ethers.getSigners();
  console.log(wallet.address);
  const Router = await hre.ethers.getContractFactory("ButterRouter");
  const router = await Router.deploy(mos_addr,butter_core_addr);

  await router.deployed();

  console.log(
    `router deployed to ${router.address}`
  );
  // await (await router.setMosAddress(mos_addr)).wait();
  // await (await router.setButterCore(butter_core_addr)).wait();
  // console.log(await router.butterCore());

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


