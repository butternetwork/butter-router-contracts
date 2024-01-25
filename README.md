# Brief Description

This project is the entry contract for [butterSwap](https://butterswap.io).

ButterRouter V2 consists of two main contracts.

- ButterRouterV2.sol is new version contract.
- SwapAdapter.sol is the swap aggregation adapter contract of the new version contract ,called by ButterRouterV2 to complete swap.

## Main interfaces explanation(v2)

1. `swapAndCall` swap tokens and execute a callback method

```solidity
    // 1. swap: _swapData.length > 0 and _bridgeData.length == 0
    // 2. swap and call: _swapData.length > 0 and _callbackData.length > 0
    function swapAndCall(
        bytes32 _transferId,
        address _srcToken,
        uint256 _amount,
        FeeType _feeType,
        bytes calldata _swapData,
        bytes calldata _callbackData,
        bytes calldata _permitData
    ) external payable;
```

2. `swapAndBridge` swap tokens and bridge outToken to other chain.

```solidity
    // 1. bridge:  _swapData.length == 0 and _bridgeData.length > 0
    // 2. swap and bridge: _swapData.length > 0 and _bridgeData.length > 0
    function swapAndBridge(
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData
    ) external payable;
```

3. `remoteSwapAndCall` called by butter mos after bridge, to swap tokens and execute a callback on target chain.

```solidity
    // At remote chain call after bridge
    // mos transfer token to router first
    //  1. swap: _swapData.length > 0 and _callbackData.length == 0
    //  2. call: _swapData.length == 0 and _callbackData.length > 0
    //  3. swap and call: _swapData.length > 0 and _callbackData.length > 0
    function remoteSwapAndCall(
        bytes32 _orderId,
        address _srcToken,
        uint256 _amount,
        uint256 _fromChain,
        bytes calldata _from,
        bytes calldata _swapAndCall
    ) external payable;
```

## Installation

```shell
npm install --save-dev @butternetwork/router
# or
yarn add --dev @butternetwork/router
```

## Contract Deployment and SetUp Workflow

### Pre-requirement

Since all of the contracts are developed in Hardhat development environment, developers need to install Hardhat before working through our contracts. The hardhat installation tutorial can be found here[hardhat](https://hardhat.org/hardhat-runner/docs/getting-started#installation)

### install

```shell
npm install
```

### create an .env file and fill following in the contents

```
PRIVATE_KEY =
TRON_PRIVATE_KEY =
ALCHEMY_KEY =
ROUTER_DEPLOY_SALT =
SWAP_ADAPTER_DEPLOY_SALT =
FEE_RECEIVER_SAlT =
```

### Compiling contracts

Simply useing hardhat built-in compile task to compile contracts.

```
$ npx hardhat compile
Compiling...
Compiled 1 contract successfully
```

The compiled artifacts will be saved in the `artifacts/` directory by default

### Testing

```
Compiled 6 Solidity files successfully
  ButterRouterV2
    ✔ setFee only owner (1442ms)
    ✔ setMosAddress only owner (147ms)
    ✔ setAuthorization only owner (129ms)
    ✔ setDexExecutor only owner (122ms)
    ✔ rescueFunds correct (130ms)
    ✔ rescueFunds only owner (129ms)
    ✔ setFee feeReceiver zero address (126ms)
    ✔ setFee feeRate less than 1000000 (124ms)
    ✔ setFee correct  (137ms)
    ✔ setMosAddress _mosAddress must be contract (100ms)
    ✔ setDexExecutor dexExecutor must be contract (111ms)
    ✔ setMosAddress correct (120ms)
    ✔ setDexExecutor correct (132ms)
    ✔ setAuthorization only owner (110ms)
    ✔ setAuthorization correct (135ms)
    ✔ swapAndCall (2920ms)
    ✔ swapAndCall (2826ms)
    ✔ swapAndBridge (2870ms)
    ✔ swapAndCall (2931ms)
    ✔ remoteSwapAndCall (2808ms)
    ✔ remoteSwapAndCall _makeUniV3Swap -> native (2764ms)
    ✔ remoteSwapAndCall _makeUniV3Swap -> tokens (2735ms)
    ✔ remoteSwapAndCall _makeUniV2Swap -> swapExactTokensForETH (2740ms)
    ✔ remoteSwapAndCall _makeUniV2Swap -> swapExactTokensForTokens (2911ms)
    ✔ remoteSwapAndCall _makeUniV2Swap -> swapExactETHForTokens (2813ms)
    ✔ remoteSwapAndCall _makeCurveSwap (2932ms)
    ✔ remoteSwapAndCall buy nft seaport (2799ms)


  27 passing (37s)
```

### Deploy and setup

The deploy script is located in tasks folder . We can run the following command to deploy.

NOTE

if deploy chain is zksync or zksyncTestnet,please compile this contract use

```
npx hardhat compile --network  `<zkSync or zkSyncTest>`
```

#### v2

1.deploy and set up before run this task, set task/config.js

```
npx hardhat routerV2 --network <network>
```

subtasks

1.routerV2:deploy

```
npx hardhat routerV2:deploy --mos <mos address> --wtoken <wtoken address> --network <network>
```

2.routerV2:deploySwapAdapter

```
npx hardhat routerV2:deploySwapAdapter --network <network>
```

3.routerV2:setAuthorization

```
npx hardhat routerV2:setAuthorization --router <router address> --executors <excutor1,excutor2,..> --flag <flag> --network <network>
```

4.routerV2:setFee

```
npx hardhat routerV2:setFee --router <router address> --feereceiver <receiver address> --feerate <rate> --fixedfee <fixedfee> --network <network>
```
