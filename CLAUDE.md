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
  index.js           # Task registration; adds --env to every project task
  utils/
    helper.js        # Shared utilities (getContract, getDeploy, createDeployer, etc.)
    httpUtil.js      # HTTP client (axios)
    bridgeData.js    # Builds V31 swapAndBridge args for plain cross-chain transfers
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

Mainnet tasks require an env, via the `--env` param (preferred) or the `NETWORK_ENV` environment variable:
```bash
npx hardhat <task> --env prod --network <network>   # production environment
npx hardhat <task> --env main --network <network>   # mainnet test environment
NETWORK_ENV=prod npx hardhat <task> --network <network>   # same, via env var
# --env overrides NETWORK_ENV (including the value in .env)
# Only "main" / "prod" are accepted; anything else errors out
# Testnet networks auto-detect as "test"; --env is ignored there
# Every project task prints ">>> env: <env>, network: <network>" before running
```

#### Router V4 (Current)
```bash
npx hardhat routerV4 --env main --network <network>                 # Full deploy + configure
npx hardhat routerV4:deploy --env main --bridge <addr> --wtoken <addr> --network <network>
npx hardhat routerV4:setAuthorization --executors <addr1,addr2> --network <network>
npx hardhat routerV4:setFee --feereceiver <addr> --feerate <rate> --fixedfee <fee> --network <network>
npx hardhat routerV4:setReferrerMaxFee --rate <rate> --native <fee> --network <network>
npx hardhat routerV4:setBridge --bridge <addr> --network <network>
npx hardhat routerV4:setFeeManager --manager <addr> --network <network>
npx hardhat routerV4:setOwner --owner <addr> --network <network>
npx hardhat routerV4:update --network <network>                     # Sync all settings from config
npx hardhat routerV4:info --network <network>                       # Display contract state
```

#### Router V31 (v3 butter bridge / MOS v3.1)
```bash
npx hardhat routerV31 --env main --network <network>                # Full deploy + configure (bridge from v3.bridge / v3.main_bridge)
npx hardhat routerV31:approveToken --token <token> --spender <bridge> --network <network>  # REQUIRED per bridged token
npx hardhat routerV31:info --env main --network <network>

# Plain cross-chain transfer, no swap on target chain. --token native wraps the native coin first.
npx hardhat routerV31:bridge --env prod --token <addr|native> --amount <human> --chain <toChainId> \
  [--receiver <addr>] [--referrer <addr>] [--header <6-byte hex>] --dryrun --network <network>
```
- V31 never approves the bridge itself: after deploy the owner must `approveToken` every token it will bridge (e.g. USDT), or `swapAndBridge` reverts.
- `routerV31:bridge` builds calldata via `tasks/utils/bridgeData.js`, matching prod tx `0x9b7b43f8…` on Map byte for byte. `--dryrun` prints calldata and simulates via eth_call without sending.
- The 6-byte payload header (default `0x010009001e00`) is copied from that prod tx; its meaning is undocumented here.
- Bridges enforce a minimum amount (`amount_too_small()`), e.g. ~15000 MAPO for Map -> Eth.

#### ReceiverV2 (Current)
Two receiver flavours, selected by the `--tss` flag (available on every `receiverV2*` task):

| deploy.json key | Bridge | Flag |
|---|---|---|
| `ReceiverV2` | v3 butter bridge / MOS v3.1 (paired with V31) | default |
| `ReceiverV2Tss` | TSS gateway (paired with V4) | `--tss` |

```bash
npx hardhat receiverV2 --env main --network <network>               # Full deploy + configure (MOS receiver)
npx hardhat receiverV2 --tss --env main --network <network>         # Full deploy + configure (TSS receiver)
npx hardhat receiverV2:deploy --bridge <addr> --wtoken <addr> [--tss] --network <network>
npx hardhat receiverV2:setAuthorization --executors <addr1,addr2> [--tss] --network <network>
npx hardhat receiverV2:setBridge --bridge <addr> [--tss] --network <network>
npx hardhat receiverV2:updateKeepers --keepers <addr1,addr2> [--tss] --network <network>   # needed for execSwap / swapRescueFunds
npx hardhat receiverV2:setOwner --owner <addr> [--tss] --network <network>
npx hardhat receiverV2:update [--tss] --network <network>
npx hardhat receiverV2:execSwap --hash <txHash> --entrance <name> [--tss] --network <network>
npx hardhat receiverV2:swapRescueFunds --hash <txHash> [--tss] --network <network>
```
- The full `receiverV2` task ALWAYS deploys a new contract and overwrites the deploy.json key. If a deploy is interrupted after the contract is created, record the address manually and run `receiverV2:setAuthorization` instead of re-running the full task.

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
  "prod": { "Bsc": { "ButterRouterV31": "0x...", "ButterRouterV4": "0x...", "ReceiverV2": "0x...", "SwapAdapterV3": "0x..." } },
  "main": { "Bsc": { "ButterRouterV31": "0x...", "ButterRouterV4": "0x...", "ReceiverV2": "0x...", "ReceiverV2Tss": "0x..." } },
  "test": { "Makalu": { "SwapAdapterV3": "0x..." } }
}
```
- **prod**: Production contracts (V2/V3/V31/V4 + shared infra like SwapAdapterV3)
- **main**: Mainnet test contracts. V31 + `ReceiverV2` on MOS v3.1 (Bsc/Map/Arbitrum/Tron), V4 + `ReceiverV2Tss` on TSS
- **test**: Testnet contracts
- `ReceiverV2` always means the v3/MOS receiver; `ReceiverV2Tss` is the TSS one (main env only)

### Network Configuration (configs/config.js)
- **wToken**: Wrapped native token address
- **tss_gateway / tss_main_gateway / tss_prod_gateway**: TSS gateway per env (used by V4 and `--tss` receivers)
- **v3.bridge**: v3 butter bridge for prod (used by V3/V31/Receiver/ReceiverV2/SolanaReceiver)
- **v3.main_bridge**: MOS v3.1 for the main env (same bridge system as v3.bridge, separate deployment). Only set on Bsc/Map/Arbitrum/Tron; other chains error out for V31/ReceiverV2 under `--env main`
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
- `getEnv(network)` — "test" for testnets, otherwise NETWORK_ENV validated against `main` / `prod`
- `getBridge(network, config, contract)` — bridge for a contract + env:

  | Contract | prod | main | test |
  |---|---|---|---|
  | V3 / V31 / Receiver / ReceiverV2 / SolanaReceiver | `v3.bridge` | `v3.main_bridge` | `v3.bridge` or `tss_gateway` |
  | V4 (and others) | `tss_prod_gateway` | `tss_main_gateway` | `tss_gateway` |
- `getTssGateway(network, config)` — TSS gateway for the env (used by `receiverV2 --tss`)
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
