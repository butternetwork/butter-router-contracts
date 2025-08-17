require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");
require("hardhat-deploy");
require('@nomiclabs/hardhat-ethers');
require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-solc");
require("@matterlabs/hardhat-zksync-verify");
require("hardhat-preprocessor");
require("@xplorfin/hardhat-solc-excludes");
require("./tasks");

const fs = require('fs');
const path = require('path');

function getRemappings() {
  return fs
    .readFileSync("remappings.txt", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim().split("="));
}


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  zksolc: {
    version: "1.5.6",
    compilerSource: "binary",
    settings: {},
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  solidity: {
    excludes: {
      directories: ["contracts/legacy"]
    },
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.25",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
  // defaultNetwork: 'Eth',
  networks: {
    hardhat: {
      chainId: 1,
      initialBaseFeePerGas: 0,
    },
    Eth: {
      url: "https://eth-mainnet.public.blastapi.io",
      chainId: 1,
      zksync: false,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Map: {
      chainId: 22776,
      url: "https://rpc.maplabs.io",
      zksync: false,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Matic: {
      url: `https://rpc.ankr.com/polygon`,
      chainId: 137,
      // gasPrice: 140000000000,
      zksync: false,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Bsc: {
      url: `https://rpc.ankr.com/bsc`,
      chainId: 56,
      zksync: false,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Klaytn: {
      url: `https://kaia.blockpi.network/v1/rpc/public`,
      chainId: 8217,
      zksync: false,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Conflux: {
      url: `https://evm.confluxrpc.com`,
      chainId: 1030,
      zksync: false,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Merlin: {
      url: `https://rpc.merlinchain.io`,
      chainId : 4200,
      gasPrice: 50000000,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Bevm: {
      url: `https://rpc-canary-2.bevm.io/`,
      chainId : 1501,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Blast: {
      url: `https://blast.blockpi.network/v1/rpc/public`,
      chainId : 81457,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Base: {
      url: `https://mainnet.base.org`,
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Ainn: {
      url: `https://mainnet-rpc.anvm.io`,
      chainId : 2649,
      gasPrice: 50000000,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    zkSync: {
      url: `https://mainnet.era.zksync.io`,
      chainId: 324,
      zksync: true,
      ethNetwork: "Eth",
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    zkLink: {
      url: `https://rpc.zklink.io`,
      chainId : 810180,
      zksync: true,
      ethNetwork: "Eth",
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    B2: {
      url: `https://rpc.bsquared.network`,
      chainId : 223,
      gasPrice: 10000,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Optimism: {
      url: `https://mainnet.optimism.io`,
      chainId : 10,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Arbitrum: {
      url: `https://arb1.arbitrum.io/rpc`,
      chainId : 42161,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Linea: {
      url: `https://rpc.linea.build`,
      chainId : 59144,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Scroll: {
      url: `https://rpc.scroll.io`,
      chainId : 534352,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Mantle: {
      url: `https://rpc.mantle.xyz`,
      chainId : 5000,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Tron: {
      url: `https://api.trongrid.io/jsonrpc`,
      chainId: 728126428,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },


    Makalu: {
      chainId: 212,
      url: "https://testnet-rpc.maplabs.io",
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    Sepolia: {
      url: `https://1rpc.io/sepolia`,
      chainId: 11155111,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    ArbitrumSepolia: {
      chainId: 421614,
      url: `https://arbitrum-sepolia.blockpi.network/v1/rpc/public`,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    BscTest: {
      url: `https://data-seed-prebsc-2-s1.binance.org:8545/`,
      chainId: 97,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    KlayTest: {
      url: `https://api.baobab.klaytn.net:8651/`,
      chainId: 1001,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    ConfluxTest: {
      url: `https://evmtestnet.confluxrpc.com`,
      chainId: 71,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    TronTest: {
      url: `https://mainnet-rpc.thundertoken.net`,
      chainId: 108,
      accounts: process.env.TRON_TESTNET_PRIVATE_KEY !== undefined ? [process.env.TRON_TESTNET_PRIVATE_KEY] : [],
    },
  },

  etherscan: {
    apiKey: {
      Bttc: process.env.API_KEY_BTTC,
      Eth:  process.env.API_KEY_ETH,
      Bsc:  process.env.API_KEY_BSC,
      Matic: process.env.API_KEY_MATIC,
      Blast: process.env.API_KEY_BLAST,
      Base: process.env.API_KEY_BASE,
      zkSync: process.env.API_KEY_ZKSYNC,
      Optimism: process.env.API_KEY_OP,
      Arbitrum: process.env.API_KEY_ARBITRUM,
      Linea: process.env.API_KEY_LINEA,
      Scroll: process.env.API_KEY_SCROLL,
      Mantle: process.env.API_KEY_MANTLE,
      Map:' '
    },
    customChains: [
      {
        network: "Bttc",
        chainId: 199,
        urls: {
          apiURL: "https://api.bttcscan.com/api",
          browserURL: "https://bttcscan.com/",
        },
      },
      {
        network: "Eth",
        chainId: 1,
        urls: {
          apiURL: "https://api.etherscan.io/api",
          browserURL: "https://etherscan.com/",
        },
      },
      {
        network: "Bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com/",
        },
      },
      {
        network: "Matic",
        chainId: 137,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com/",
        },
      },
      {
        network: "Blast",
        chainId: 81457,
        urls: {
          apiURL: "https://api.blastscan.io/api",
          browserURL: "https://blastscan.io/",
        },
      },
      {
        network: "Base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org/",
        },
      },
      {
        network: "zkSync",
        chainId: 324,
        urls: {
          apiURL: "https://api-era.zksync.network/api",
          browserURL: "https://era.zksync.network/",
        },
      },
      {
        network: "Optimism",
        chainId: 10,
        urls: {
          apiURL: "https://api-optimistic.etherscan.io/api",
          browserURL: "https://optimistic.etherscan.io/",
        },
      },
      {
        network: "Arbitrum",
        chainId: 42161,
        urls: {
          apiURL: "https://api.arbiscan.io/api",
          browserURL: "https://arbiscan.io/",
        },
      },
      {
        network: "Linea",
        chainId: 59144,
        urls: {
          apiURL: "https://api.lineascan.build/api",
          browserURL: "https://lineascan.build",
        },
      },
      {
        network: "Scroll",
        chainId: 534352,
        urls: {
          apiURL: "https://api.scrollscan.com/api",
          browserURL: "https://scrollscan.com/",
        },
      },
      {
        network: "Mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://api.mantlescan.xyz/api",
          browserURL: "https://mantlescan.xyz/",
        },
      },
      {
        network: "Map",
        chainId: 22776,
        urls: {
          apiURL: "https://explorer-api.chainservice.io/api",
          browserURL: "https://explorer.mapprotocol.io"
        },
      }
    ],
  },
};
