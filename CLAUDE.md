# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Butter Network Router smart contracts repository - a cross-chain omni-swap protocol built on MAP Protocol. The project enables token swaps and cross-chain bridging through multiple decentralized exchanges.

## Key Architecture Components

### Core Router Contracts
- **ButterRouterV2.sol**: Legacy router contract for cross-chain swaps
- **ButterRouterV3.sol**: Enhanced router with improved fee management and multi-bridge support
- **ButterRouterV31.sol**: Gas-optimized version of V3 with adjusted fee strategy (no fees on bridge operations)
- **SwapAdapter.sol**: Aggregates multiple DEX protocols for optimal routing

### Abstract Base Contracts
- **abstract/Router.sol**: Base router functionality with fee management
- **abstract/SwapCallV2.sol**: Enhanced swap execution logic with security improvements
- **abstract/FeeManager.sol**: Fee collection and distribution system

### Supporting Infrastructure
- **OmniAdapter.sol**: Multi-chain adapter for cross-chain operations
- **Receiver.sol**: Handles incoming cross-chain transactions
- **IntegratorManager.sol**: Manages third-party integrations
- **lib/DexExecutor.sol**: DEX interaction utilities
- **lib/Helper.sol**: Common utility functions

## Development Commands

### Building and Testing
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Compile for zkSync networks
npx hardhat compile --network zkSync

# Run tests
npx hardhat test

# Format code
npm run format

# Flatten contracts (remove duplicates and create single files)
npm run flatten:all
npm run flatten:routers
npm run flatten:adapters
npm run flatten:receivers
```

### Deployment and Configuration

#### Router V31 Deployment (Gas-Optimized V3)
```bash
# Deploy complete Router V31 setup (gas-optimized version)
npx hardhat routerV31 --network <network>

# Deploy Router V31 contract only
npx hardhat routerV31:deploy --bridge <bridge_address> --wtoken <wtoken_address> --network <network>

# Configure executors (DEX routers)
npx hardhat routerV31:setAuthorization --router <router_address> --executors <executor1,executor2> --flag <true/false> --network <network>

# Set fee parameters (applies only to swap and swapAndCall, NOT bridge operations)
npx hardhat routerV31:setFee --router <router_address> --feereceiver <receiver_address> --feerate <rate> --fixedfee <fee> --network <network>

# Set referrer max fees
npx hardhat routerV31:setReferrerMaxFee --router <router_address> --rate <max_rate> --native <max_native_fee> --network <network>

# Set bridge address
npx hardhat routerV31:setBridge --router <router_address> --bridge <bridge_address> --network <network>

# Set fee manager
npx hardhat routerV31:setFeeManager --router <router_address> --manager <fee_manager_address> --network <network>
```

#### Router V3 Deployment (Legacy)
```bash
# Deploy complete Router V3 setup
npx hardhat routerV3 --network <network>

# Deploy Router V3 contract only
npx hardhat routerV3:deploy --bridge <bridge_address> --wtoken <wtoken_address> --network <network>

# Configure executors (DEX routers)
npx hardhat routerV3:setAuthorization --router <router_address> --executors <executor1,executor2> --flag <true/false> --network <network>

# Set fee parameters
npx hardhat routerV3:setFee --router <router_address> --feereceiver <receiver_address> --feerate <rate> --fixedfee <fee> --network <network>
```

#### Router V2 Deployment (Legacy)
```bash
# Deploy Router V2 setup
npx hardhat routerV2 --network <network>

# Individual components
npx hardhat routerV2:deploy --mos <mos_address> --wtoken <wtoken_address> --network <network>
npx hardhat routerV2:deploySwapAdapter --network <network>
```

#### Other Deployments
```bash
# Deploy swap adapter
npx hardhat deploySwapAdapter --network <network>

# Deploy fee receiver
npx hardhat deployFeeReceiver --payees <address1,address2> --shares <share1,share2> --network <network>

# Deploy omni adapter
npx hardhat deployOmniAdapter --network <network>
```

### Contract Flattening

The project includes comprehensive contract flattening functionality to generate single-file versions for verification and audit purposes.

#### Available Flatten Commands
```bash
# Flatten all contracts
npx hardhat flatten:all

# Flatten specific contract categories
npx hardhat flatten:all-routers    # All router contracts (V2, V3, V31)
npx hardhat flatten:adapters       # Swap adapters and omni adapters  
npx hardhat flatten:receivers      # Receiver contracts

# Flatten specific contracts
npx hardhat flatten:contract --contract ButterRouterV31
npx hardhat flatten:contract --contract ButterRouterV3
npx hardhat flatten:contract --contract SwapAdapterV3

# Custom output directory
npx hardhat flatten:contract --contract ButterRouterV31 --output verification
```

#### NPM Scripts for Flattening
```bash
npm run flatten:all        # Flatten all contracts
npm run flatten:routers    # Flatten router contracts only
npm run flatten:adapters   # Flatten adapter contracts only  
npm run flatten:receivers  # Flatten receiver contracts only
npm run flatten:v31        # Flatten ButterRouterV31 only
npm run flatten:v3         # Flatten ButterRouterV3 only
npm run flatten:v2         # Flatten ButterRouterV2 only
```

#### Flatten Features
- **Automatic Cleanup**: Removes duplicate SPDX license identifiers and pragma statements
- **File Organization**: Groups all dependencies in logical order
- **Size Optimization**: Eliminates redundant imports and file headers
- **Verification Ready**: Output format suitable for Etherscan and other verification services

#### Router V31 Specific Operations
```bash
# Approve tokens for spending
npx hardhat routerV31:approveToken --router <router_address> --token <token_address> --spender <spender_address> --amount <amount> --network <network>

# Edit function blacklist
npx hardhat routerV31:editFuncBlackList --router <router_address> --func <function_selector> --flag <true/false> --network <network>

# Execute bridge transactions (no fees collected - gas optimized)
npx hardhat routerV31:bridge --router <router_address> --token <token_address> --amount <amount> --chain <target_chain_id> --network <network>

# Get contract information
npx hardhat routerV31:info --router <router_address> --network <network>

# Update configuration from config file
npx hardhat routerV31:update --router <router_address> --network <network>
```

#### V31 vs V3 Key Differences
- **Gas Optimization**: V31 optimized for lower gas consumption
- **Bridge Fee Strategy**: V31 does not collect fees on `swapAndBridge` operations
- **Fee Collection**: V31 only collects fees on pure swap and `swapAndCall` operations
- **Same Interface**: V31 maintains compatibility with V3 deployment and management commands

## Configuration System

### Network Configuration
All network-specific settings are stored in `configs/config.js`:
- **wToken**: Wrapped native token address for each chain
- **bridge/mos**: Cross-chain bridge contract addresses
- **executors**: Approved DEX router contracts (1inch, UniSwap, SushiSwap, etc.)
- **fee**: Fee rates and receiver addresses per network

### Multi-Chain Support
Configured networks include:
- **Mainnets**: Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, Blast, Scroll, Linea, Mantle, Map Protocol, Klaytn, Conflux, Tron, zkSync, Merlin, Ainn
- **Testnets**: Sepolia, BSC Testnet, Makalu (Map testnet), Arbitrum Sepolia

## Project Structure Notes

### Version Evolution
- **V2**: Original router with MOS bridge integration
- **V3**: Enhanced with improved fee management and multi-bridge support
- **V31**: Gas-optimized version of V3 with adjusted fee strategy - bridge operations do not incur fees

### Fee System
- Router fees are collected as percentage + fixed amounts
- Referrer/integrator fees supported in V3+
- Fee denominators: V2 uses 1,000,000, V3/V31 use 10,000
- **V31 Key Difference**: Bridge operations (`swapAndBridge`) do not collect fees for gas optimization
- V31 maintains fee collection only for pure swap and swap-and-call operations

### Cross-Chain Flow
1. User calls `swapAndBridge()` on source chain
2. Tokens are swapped via configured DEX executors
3. Bridged tokens are sent via MAP Protocol bridge
4. Destination chain calls `remoteSwapAndCall()` 
5. Final swap and/or callback execution occurs

### Testing Framework
- Uses Hardhat with Chai for testing
- Fork testing against mainnet for realistic scenarios
- Mock contracts available in `contracts/mock/`

## Environment Setup

Required `.env` variables:
```
PRIVATE_KEY=
TRON_PRIVATE_KEY=
ALCHEMY_KEY=
ROUTER_DEPLOY_SALT=
ROUTER_V3_DEPLOY_SALT=
ROUTER_V31_DEPLOY_SALT=
SWAP_ADAPTER_DEPLOY_SALT=
FEE_RECEIVER_SAlT=
```

API keys needed for contract verification:
```
API_KEY_ETH=
API_KEY_BSC=
API_KEY_MATIC=
API_KEY_BLAST=
API_KEY_BASE=
[additional chain API keys as needed]
```