require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config")
require('hardhat-deploy');
require('@matterlabs/hardhat-zksync-deploy') 
require('@matterlabs/hardhat-zksync-solc')
require('@matterlabs/hardhat-zksync-verify')
require('./tasks')

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  zksolc: {
    version: '1.3.10',
    compilerSource: 'binary',
    settings: {},
  },
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }]
  },
  namedAccounts: {
    deployer: 0,
  },
  // defaultNetwork: 'Eth',
  networks:{
    hardhat: {
      chainId:1,
      initialBaseFeePerGas: 0,
    },
    Eth: {
      url: `https://mainnet.infura.io/v3/` + process.env.INFURA_KEY,
      chainId : 1,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Map : {
      chainId: 22776,
      url:"https://rpc.maplabs.io",
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Matic: {
      url: `https://polygon.llamarpc.com`,
      chainId : 137,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Avalanche: {
      url: `https://1rpc.io/avax/c`,
      chainId : 43114,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Bsc: {
      url: `https://rpc.ankr.com/bsc`,
      chainId : 56,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Klaytn: {
      url: `https://public-node-api.klaytnapi.com/v1/cypress`,
      chainId : 8217,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Arbitrum: {
      url: `https://1rpc.io/arb`,
      chainId : 42161,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    zkSync: {
      url: `https://mainnet.era.zksync.io`,
      chainId : 324,
      zksync: true,
      ethNetwork: 'Eth',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Optimism: {
      url: `https://1rpc.io/op`,
      chainId : 10,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Fantom: {
      url: `https://1rpc.io/ftm`,
      chainId : 250,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Gnosis: {
      url: `https://rpc.ankr.com/gnosis`,
      chainId : 100,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Aurora: {
      url: `https://mainnet.aurora.dev`,
      chainId : 1313161554,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Astar: {
      url: `https://evm.astar.network`,
      chainId : 592,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Boba: {
      url: `https://mainnet.boba.network`,
      chainId : 288,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Celo: {
      url: `https://rpc.ankr.com/celo`,
      chainId : 42220,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Okt: {
      url: `https://exchainrpc.okex.org/`,
      chainId : 66,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Cronos: {
      url: `https://cronos-evm.publicnode.com`,
      chainId : 25,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Ethw: {
      url: `https://mainnet.ethereumpow.org`,
      chainId : 10001,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Harmony: {
      url: `https://rpc.ankr.com/harmony`,
      chainId : 1666600000,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Kava: {
      url: `https://evm2.kava.io`,
      chainId : 2222,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Metis: {
      url: `https://andromeda.metis.io/?owner=1088`,
      chainId : 1088,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Moonbeam: {
      url: `https://rpc.ankr.com/moonbeam`,
      chainId : 1284,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Moonriver: {
      url: `https://rpc.api.moonriver.moonbeam.network`,
      chainId : 1285,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Oasis: {
      url: `https://emerald.oasis.dev`,
      chainId : 42262,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Syscoin: {
      url: `https://rpc.syscoin.org`,
      chainId : 57,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Telos: {
      url: `https://mainnet.telos.net/evm`,
      chainId : 40,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Velas: {
      url: `https://evmexplorer.velas.com/rpc`,
      chainId : 106,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Fuse: {
      url: `https://rpc.fuse.io/`,
      chainId : 122,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    zkEvm: {
      url: `https://zkevm-rpc.com`,
      chainId : 1101,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Linea: {
      url: `https://rpc.linea.build`,
      chainId : 59144,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Base: {
      url: `https://base.blockpi.network/v1/rpc/public`,
      chainId : 8453,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Filecoin: {
      url: `https://rpc.ankr.com/filecoin`,
      chainId : 314,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Kcc: {
      url: `https://kcc-rpc.com`,
      chainId : 321,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Thunder: {
      url: `https://mainnet-rpc.thundertoken.net`,
      chainId : 108,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Tron: {
      url: `https://mainnet-rpc.thundertoken.net`,
      chainId : 108,//728126428,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },


    MaticTest: {
      url: `https://polygon-mumbai.blockpi.network/v1/rpc/public`,
      chainId : 80001,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    BscTest: {
      url: "https://endpoints.omniatech.io/v1/bsc/testnet/public",
      chainId : 97,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Makalu: {
      chainId: 212,
      url:"https://testnet-rpc.maplabs.io",
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Goerli: {
      url: "https://rpc.ankr.com/eth_goerli",
      chainId : 5,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    KlayTest: {
      url: `https://api.baobab.klaytn.net:8651/`,
      chainId : 1001,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    zkSyncTest: {
      url: 'https://testnet.era.zksync.dev',
      chainId : 280,
      ethNetwork: 'Goerli', // or a Goerli RPC endpoint from Infura/Alchemy/Chainstack etc.
      zksync: true,
      verifyURL:
        'https://zksync2-testnet-explorer.zksync.dev/contract_verification',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    TronTest: {
      url: `https://mainnet-rpc.thundertoken.net`,
      chainId : 108,
      zksync: false,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

  }
};
