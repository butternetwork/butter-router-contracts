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
    hardhat: {
      chainId:1,
      initialBaseFeePerGas: 0,
      // forking: {
      //   url: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
      //   blockNumber: 16930373        //15986531
      // }
    },
    Matic: {
      url: `https://polygon.llamarpc.com`,
      chainId : 137,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    MaticTest: {
      url: `https://polygon-mumbai.blockpi.network/v1/rpc/public`,
      chainId : 80001,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Avalanche: {
      url: `https://1rpc.io/avax/c`,
      chainId : 43114,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Bsc: {
      url: `https://bsc-dataseed1.binance.org/`,
      chainId : 56,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    BscTest: {
      url: "https://bsc-testnet.public.blastapi.io",
      chainId : 97,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Map : {
      chainId: 22776,
      url:"https://rpc.maplabs.io",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Makalu: {
      chainId: 212,
      url:"https://testnet-rpc.maplabs.io",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Eth: {
      url: `https://mainnet.infura.io/v3/` + process.env.INFURA_KEY,
      chainId : 1,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Goerli: {
      url: "https://rpc.ankr.com/eth_goerli",
      chainId : 5,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  }
};
