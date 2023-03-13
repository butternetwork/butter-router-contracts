require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config")
require('hardhat-deploy');
require('./tasks')

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  namedAccounts: {
    deployer: 0,
  },
  networks:{
    hardhat:{
      forking:{
        enabled:true,
        chainid:97,
        url:'https://bsc-testnet.public.blastapi.io'      
      },
    },
    matic_testnet: {
      url: `https://polygon-mumbai.blockpi.network/v1/rpc/public`,
      chainId : 80001,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    bsc_test: {
      url: process.env.BSC_TEST_RPC_URL || "",
      chainId : 97,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    makalu: {
      chainId: 212,
      url:"https://testnet-rpc.maplabs.io",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Goerli: {
      url: `https://goerli.infura.io/v3/` + process.env.GOERLI_API_KEY,
      chainId : 5,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  }
};


   // mainnet  url:'https://rpc.ankr.com/bsc