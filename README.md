# Brief Description

This project is  the entry contract for [butterSwap](https://butterswap.io).

ButterRouter.sol is  the old version of the main contract.

ButterRouter V2 consists of three main contracts.

* ButterRouterV2.sol  is new version contract.
* AggregationAdapter.sol  is the swap aggregation adapter contract of the new version contract ,called by ButterRouterV2  to complete swap.
* Receiver.sol is impls for bridges. called by bridges to complete swap or others on target chain.

## Main interfaces explanation(v2)

1. `swapAndCall`  swap tokens and execute a callback method

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

PRIVATE_KEY=
ALCHEMY_KEY = 
DEPLOY_FACTORY = 0x6258e4d2950757A749a4d4683A7342261ce12471;
//bytes32 deploy ButterRouterV2 salt
ROUTER_DEPLOY_SALT = 
PLUS_DEPLOY_SALT =
AGG_DEPLOY_SALT = 
RECEIVER_DEPLOY_SALT = 
RUBIC_ADAPTER_SALT = 
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

The deploy script is located in deploy folder . We can run the following command to deploy.

#### v1

1. deploy

```
npx hardhat deployRouter --mos <mos address> --core <core address> --network <network>
```

2. set core

```
npx hardhat setCore --router <router address> --core  <core address > --network <network>
```

3. set mos

```
npx hardhat setMos --router <router address> --mos  <mos address> --network <network>
```

---

#### v2

1. deploy router

```
npx hardhat deployRouterV2 --mos <mos address>  --wtoken <wtoken address> --network <network>
```

2. deployAggregationAdapter

```
npx hardhat deployAggregationAdapter --network <network>
```

3. set mos

```
npx hardhat setV2Mos --router <router address> --mos  <mos address> --network <network>
```

4. set authorization

```
npx hardhat setAuthorization --router <router address> --executors <excutors address array> --flag <flag> --network <network>
```

**NOTE**

* approve flag `true`  indicates that it can be called by router)
* multi executors separation by ',', like `0xd73bF6a58481715B5A3B72E9ca214A44C7Ba4533,0xd73bF6a58481715B5A3B72E9ca214A44C7Ba4533`

5. setFee  (feeRate - the denominator is 1000000, fixed fee is in wei)

```
npx hardhat setFee --router <router address> --feereceiver <feeReceiver address> --feerate <feeRate> --fixedfee <fixedFee> --network <network>
```

6. deployAndSetUp

before run this task, set task/config.js

```
npx hardhat deployAndSetUp  --network <network>
```

7. deployRouterPlus

   ```shell
   npx hardhat deployRouterPlus--network <network>
   ```
8. deployFeeReceiver

   ```
   npx hardhat deployFeeReceiver --payees <addressA,addressB> --shares <share1,share2> --network <network>
   ```
9. deployAndSetUpZk

**before run this task, compile the contracts**

```shell
npx hardhat compile --network  `<zkSync or zkSyncTest>`
```

```shell
npx hardhat deployAndSetUpZk --network <zkSync or zkSyncTest>
```

  10.deployRouterPlusZk

```shell
npx hardhat deployRouterPlusZk --network <zkSync or zkSyncTest>
```

11. deployRubicAdapter

    ```shell
    npx hardhat deployRubicAdapter --network <network>
    ```
12. deployFeeReceiverZk

    ```
    npx hardhat deployFeeReceiverZk --payees <addressA,addressB> --shares <share1,share2> --network <zkSync or zkSyncTest>
    ```
13. deployReceiver

```shell
npx hardhat deployReceiver --router <butter router address> --network <network>
```

14.setStargateRouter

```shell
npx hardhat setStargateRouter --receiver <receiver address> --stargate <stargate router address> --network <network>
```

15.setAmarokRouter

```shell
npx hardhat setAmarokRouter --receiver <receiver address> --amarok <amarok router address> --network <network>
```

16.setCBridgeMessageBus

```shell
npx hardhat setCBridgeMessageBus --receiver <receiver address> --cbridge <cbridge messageBus address> --network <network>
```

17.setButter

```shell
npx hardhat setButter --receiver <receiver address> --butter <butter router address> --network <network>
```

18.deployTransferProxy

```
npx hardhat deployTransferProxy --network <network>
```
