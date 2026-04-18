# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Butter Network Router smart contracts repository - a cross-chain omni-swap protocol built on MAP Protocol. The project enables token swaps and cross-chain bridging through multiple decentralized exchanges.

## Key Architecture Components

### Core Router Contracts
- **ButterRouterV4.sol**: Current production router (0.8.25, evmVersion: london)
- **ButterRouterV31.sol**: Gas-optimized version with zero-fee cross-chain strategy
- **ButterRouterV3.sol**: Legacy router with fee management and multi-bridge support
- **ButterRouterV2.sol**: Legacy router (in contracts/legacy/)
- **SwapAdapter.sol**: Aggregates multiple DEX protocols for optimal routing

### Abstract Base Contracts
- **abstract/SwapCallV2.sol**: Enhanced swap execution logic with security improvements
- **abstract/FeeManager.sol**: Fee collection and distribution system
- **abstract/Aggregator.sol**: Swap aggregation base

### Supporting Infrastructure
- **ReceiverV2.sol**: Current production receiver for cross-chain transactions
- **Receiver.sol**: Legacy receiver
- **SolanaReceiver.sol**: Solana-specific receiver
- **OmniAdapter.sol**: Multi-chain adapter for cross-chain operations
- **IntegratorManager.sol**: Manages third-party integrations

## Tech Stack

- **Solidity**: 0.8.25 (new contracts), 0.8.20 (legacy contracts)
- **Hardhat**: 2.22+ with toolbox v5
- **ethers**: v6
- **@mapprotocol/common-contracts**: ^0.4.0 (deploy, verify, Tron support)
- **OpenZeppelin**: 4.9.x
- **Tron**: via TronWeb + TronClient from common-contracts

## Project Structure

```
contracts/           # Solidity source
  legacy/            # V2 and old contracts (excluded from compile)
  abstract/          # Base contracts
  lib/               # Utility libraries
  mock/              # Test mocks
  interface/         # Interfaces
tasks/
  index.js           # Task registration
  utils/
    helper.js        # Shared utilities (getContract, getDeploy, createDeployer, etc.)
    httpUtil.js      # HTTP client (axios)
  common/
    common.js        # Shared contract operations (setAuthorization, setBridge, setOwner, etc.)
  subs/
    routerV4.js      # ButterRouterV4 tasks
    receiverV2.js    # ReceiverV2 tasks
    routerV31.js     # ButterRouterV31 tasks
    routerV3.js      # ButterRouterV3 tasks
    receiver.js      # Receiver V1 tasks
    solanaReveiver.js # SolanaReceiver tasks
    verify.js        # Contract verification (EVM + Tron)
    flatten.js       # Contract flattening
    ...              # Other deploy tasks
configs/
  config.js          # Network-specific settings (bridges, executors, fees, wToken)
deployments/
  deploy.json        # 3-layer structure: { prod: {}, main: {}, test: {} }
```

## Development Commands

### Building and Testing
```bash
npm install --legacy-peer-deps   # Install dependencies
npx hardhat compile               # Compile contracts
npx hardhat compile --force       # Force recompile
npx hardhat test                  # Run tests
npm run format                    # Format code
```

### Deployment

All deployment requires `NETWORK_ENV` environment variable:
```bash
NETWORK_ENV=main    # mainnet test environment
NETWORK_ENV=prod    # production environment
# Testnet networks auto-detect, no NETWORK_ENV needed
```

#### Router V4 (Current)
```bash
NETWORK_ENV=main npx hardhat routerV4 --network <network>          # Full deploy + configure
NETWORK_ENV=main npx hardhat routerV4:deploy --bridge <addr> --wtoken <addr> --network <network>
npx hardhat routerV4:setAuthorization --executors <addr1,addr2> --network <network>
npx hardhat routerV4:setFee --feereceiver <addr> --feerate <rate> --fixedfee <fee> --network <network>
npx hardhat routerV4:setReferrerMaxFee --rate <rate> --native <fee> --network <network>
npx hardhat routerV4:setBridge --bridge <addr> --network <network>
npx hardhat routerV4:setFeeManager --manager <addr> --network <network>
npx hardhat routerV4:setOwner --owner <addr> --network <network>
npx hardhat routerV4:update --network <network>                     # Sync all settings from config
npx hardhat routerV4:info --network <network>                       # Display contract state
```

#### ReceiverV2 (Current)
```bash
NETWORK_ENV=main npx hardhat receiverV2 --network <network>         # Full deploy + configure
NETWORK_ENV=main npx hardhat receiverV2:deploy --bridge <addr> --wtoken <addr> --network <network>
npx hardhat receiverV2:setAuthorization --executors <addr1,addr2> --network <network>
npx hardhat receiverV2:setBridge --bridge <addr> --network <network>
npx hardhat receiverV2:updateKeepers --keepers <addr1,addr2> --network <network>
npx hardhat receiverV2:setOwner --owner <addr> --network <network>
npx hardhat receiverV2:update --network <network>
npx hardhat receiverV2:execSwap --hash <txHash> --network <network>
npx hardhat receiverV2:swapRescueFunds --hash <txHash> --network <network>
```

#### Contract Verification
```bash
# EVM (auto-routes to etherscan/blockscout)
npx hardhat verifyContract --contract ButterRouterV4 --address <addr> --args '[...]' --network <network>

# Tron (auto-routes to TronScan API)
npx hardhat verifyContract --contract ButterRouterV4 --address <tron_addr> --args '[...]' --network Tron
```

### Contract Flattening
```bash
npx hardhat flatten:contract --contract ButterRouterV4
npx hardhat flatten:all-routers
npx hardhat flatten:adapters
npx hardhat flatten:receivers
npx hardhat flatten:all
```

## Configuration System

### deploy.json Structure
Three-layer structure separating environments:
```json
{
  "prod": { "Eth": { "ButterRouterV4": "0x...", "ReceiverV2": "0x...", "SwapAdapterV3": "0x..." } },
  "main": { "Eth": { "ButterRouterV4": "0x...", "ReceiverV2": "0x..." } },
  "test": { "Makalu": { "SwapAdapterV3": "0x..." } }
}
```
- **prod**: Production contracts (V2/V3/V31/V4 + shared infra like SwapAdapterV3)
- **main**: Mainnet test contracts (V4/ReceiverV2 only)
- **test**: Testnet contracts

### Network Configuration (configs/config.js)
- **wToken**: Wrapped native token address
- **tss_gateway / tss_main_gateway / tss_prod_gateway**: Bridge addresses per env
- **v3.executors**: Approved DEX router contracts
- **v3.fee**: Fee rates and receiver addresses

### Tron Configuration
Tron networks use separate private keys and RPC:
- `TRON_PRIVATE_KEY` / `TRON_TESTNET_PRIVATE_KEY` in .env
- `TRON_RPC_URL` (defaults to api.trongrid.io)
- TronClient from `@mapprotocol/common-contracts` handles address conversion and tx signing

## Task Architecture

### Shared Utilities (tasks/utils/helper.js)
- `getContract(name, hre, addr)` — returns contract instance (EVM ethers v6 or Tron with .sendAndWait())
- `getDeploy(network, key, env?)` — read from deploy.json
- `saveDeploy(network, key, addr, env?)` — write to deploy.json
- `getDeployerAddr(hre)` — deployer address (hex for both EVM/Tron)
- `createDeployer(hre, opts)` — unified deploy (from @mapprotocol/common-contracts)
- `getBridge(network, config)` — resolve bridge address from config + NETWORK_ENV
- `isTronNetwork`, `tronToHex`, `tronFromHex` — Tron address utilities

### Shared Operations (tasks/common/common.js)
- `setAuthorization(hre, contractName, addr, executors, flag)` — compare-before-send
- `setBridge(hre, contractName, addr, bridge)` — compare-before-send
- `setOwner(hre, contractName, addr, owner)` — compare-before-send
- `removeAuth(hre, contractName, addr, removes)` — remove deprecated executors
- `checkFee(hre, contractName, addr, feeConfig)` — check and update fee settings

### EVM vs Tron Pattern
All tasks handle both EVM and Tron with separate branches:
```js
if (isTronNetwork(hre.network.name)) {
    await contract.method(tronToHex(addr)).sendAndWait();  // write
    let val = await contract.method().call();               // read
} else {
    await (await contract.method(addr)).wait();             // write
    let val = await contract.method();                      // read
}
```

## Compiler Configuration

Two Solidity compilers configured (0.8.25 first for `^0.8.0` priority):
- **0.8.25**: evmVersion london, optimizer 200 runs — new contracts (V4, ReceiverV2, V31)
- **0.8.20**: evmVersion london, optimizer 200 runs — legacy contracts (V3, SwapAdapter)

Important: `evmVersion` must be inside `settings` object, not at compiler level.

## Environment Setup

Required `.env` variables:
```
PRIVATE_KEY=              # EVM mainnet
TESTNET_PRIVATE_KEY=      # EVM testnet
TRON_PRIVATE_KEY=         # Tron mainnet
TRON_TESTNET_PRIVATE_KEY= # Tron testnet
TRON_RPC_URL=             # Tron RPC (optional, defaults to trongrid)
NETWORK_ENV=              # Required for mainnet: main or prod

# Deploy salts (EVM only, Tron does not use salt)
ROUTER_V4_DEPLOY_SALT=
RECEIVER_V2_DEPLOY_SALT=
ROUTER_V3_DEPLOY_SALT=
ROUTER_V31_DEPLOY_SALT=
SWAP_ADAPTER_DEPLOY_SALT=

# Verification API keys
API_KEY_ETH=
API_KEY_BSC=
# ... (see .env.example for full list)

# Butter Router API (for execSwap recovery)
BUTTER_ROUTER_API=
```

## Fee System
- Fee denominators: V2 uses 1,000,000, V3/V31/V4 use 10,000
- V31 Zero-Fee Cross-Chain: `swapAndBridge` NEVER collects fees
- V4: Configurable fees on both swapAndCall and swapAndBridge
- All set operations compare current on-chain values before sending transactions

## Cross-Chain Flow
1. User calls `swapAndBridge()` on source chain
2. Tokens are swapped via configured DEX executors
3. Bridged tokens are sent via MAP Protocol bridge (gateway)
4. Destination chain ReceiverV2 calls `remoteSwapAndCall()`
5. Final swap and/or callback execution occurs
6. If swap fails, `execSwap` or `swapRescueFunds` can recover funds
