# Butter Router Contracts

Cross-chain omni-swap protocol contracts built on [MAP Protocol](https://mapprotocol.io). Enables token swaps and cross-chain bridging through multiple DEX protocols.

## Contracts

| Contract | Version | Description |
|----------|---------|-------------|
| ButterRouterV4 | 0.8.25 | Current production router |
| ReceiverV2 | 0.8.25 | Current production cross-chain receiver |
| ButterRouterV31 | 0.8.25 | Gas-optimized router (zero-fee cross-chain) |
| ButterRouterV3 | 0.8.20 | Legacy router |
| SwapAdapter | 0.8.20 | DEX swap aggregation adapter |

## Main Interfaces (V4)

### swapAndCall
Swap tokens and execute a callback on the same chain.
```solidity
function swapAndCall(
    bytes32 _transferId,
    address _initiator,
    address _srcToken,
    uint256 _amount,
    bytes calldata _swapData,
    bytes calldata _callbackData,
    bytes calldata _permitData,
    bytes calldata _feeData
) external payable;
```

### swapAndBridge
Swap tokens and bridge to another chain.
```solidity
function swapAndBridge(
    bytes32 _transferId,
    address _initiator,
    address _srcToken,
    uint256 _amount,
    bytes calldata _swapData,
    bytes calldata _bridgeData,
    bytes calldata _permitData,
    bytes calldata _feeData
) external payable;
```

## Installation

```bash
npm install --save-dev @butternetwork/router
```

## Development Setup

### Prerequisites
- Node.js >= 18
- npm

### Install
```bash
npm install --legacy-peer-deps
```

### Environment
Copy `.env.example` to `.env` and fill in:
```
PRIVATE_KEY=              # EVM mainnet deployer
TRON_PRIVATE_KEY=         # Tron mainnet deployer
NETWORK_ENV=              # Required for mainnet: "main" or "prod"
```

See `.env.example` for the full list of variables.

### Compile
```bash
npx hardhat compile
```

### Test
```bash
npx hardhat test
```

## Deployment

All mainnet deployments require `NETWORK_ENV` to be set:
```bash
# Deploy Router V4 + configure (full flow)
NETWORK_ENV=main npx hardhat routerV4 --network Eth

# Deploy ReceiverV2 + configure
NETWORK_ENV=main npx hardhat receiverV2 --network Eth

# Tron deployment (no CREATE2 salt)
NETWORK_ENV=main npx hardhat routerV4 --network Tron
```

### Configuration Tasks
```bash
# All set tasks compare on-chain values before sending transactions
npx hardhat routerV4:setAuthorization --executors <addr1,addr2> --network <network>
npx hardhat routerV4:setFee --feereceiver <addr> --feerate <rate> --fixedfee <fee> --network <network>
npx hardhat routerV4:setBridge --bridge <addr> --network <network>
npx hardhat routerV4:update --network <network>    # Sync all settings from config
npx hardhat routerV4:info --network <network>      # Display contract state
```

### Verification
```bash
# EVM chains (Etherscan, etc.)
npx hardhat verifyContract --contract ButterRouterV4 --address <addr> --args '[...]' --network Eth

# Tron (TronScan API)
npx hardhat verifyContract --contract ButterRouterV4 --address <tron_addr> --args '[...]' --network Tron
```

### Contract Flattening
```bash
npx hardhat flatten:contract --contract ButterRouterV4
npx hardhat flatten:all
```

## Architecture

### Deploy Record (deployments/deploy.json)
Three-layer structure separating environments:
- **prod** — Production contracts (all versions + shared infra)
- **main** — Mainnet test contracts (V4/ReceiverV2)
- **test** — Testnet contracts

### Cross-Chain Flow
1. User calls `swapAndBridge()` on source chain
2. Tokens swapped via configured DEX executors
3. Bridged via MAP Protocol gateway
4. ReceiverV2 on destination calls `remoteSwapAndCall()`
5. Final swap/callback execution
6. Failed swaps recoverable via `execSwap` or `swapRescueFunds`

### Fee System
- Fee denominator: 10,000 (V3/V31/V4)
- V31: Zero fees on `swapAndBridge` (gas-optimized)
- V4: Configurable fees on all operations

## Supported Networks

**Mainnets**: Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, Blast, Scroll, Linea, Mantle, Map Protocol, Klaytn, Conflux, Tron, zkSync, Merlin, Avalanche, Unichain, Xlayer

**Testnets**: Sepolia, BSC Testnet, Makalu, Arbitrum Sepolia, Tron Nile

## License

MIT
