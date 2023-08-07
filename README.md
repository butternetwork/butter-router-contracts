# Brief Description

This project is  the entry contract for [butterSwap](https://butterswap.io).

ButterRouter.sol is  the old version of the main contract.

ButterRouter V2 consists of three main contracts.

* ButterRouterV2.sol  is new version contract.
* SwapAdapter.sol  is the swap aggregation adapter contract of the new version contract ,called by ButterRouterV2  to complete swap.
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
PRIVATE_KEY =  
ALCHEMY_KEY = 
DEPLOY_FACTORY = 
ROUTER_DEPLOY_SALT = 
PLUS_DEPLOY_SALT = 
SWAP_ADAPTER_DEPLOY_SALT = 
RECEIVER_DEPLOY_SALT = 
AGG_ADAPTER_SALT = 
FEE_RECEIVER_SAlT = 
TRANSFER_PROXY_SALT = 
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
npx hardhat deployRouterV1 --mos <mos address> --core <core address> --network <network>
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

NOTE

if deploy chain is zksync or zksyncTestnet,please compile this contract use

```
npx hardhat compile --network  `<zkSync or zkSyncTest>`
```

1.deploy deployRouterV2

```
npx hardhat deployRouterV2 --mos <mos address>  --wtoken <wtoken address> --network <network>
```

2.deployRouterPlus

```
npx hardhat deployRouterPlus --wtoken <wtoken address> --network <network>
```

3.deploySwapAdapter

```
npx hardhat deploySwapAdapter --network <network>
```

4.deployFeeReceiver

```
npx hardhat deployFeeReceiver --payees <addr1,addr2,..> --shares <share1,share2,..> --network <network>
```

5.deployTransferProxy

```
npx hardhat deployTransferProxy --network <network>
```

6.setAuthorization

```
npx hardhat setAuthorization --router <router address> --executors <excutor1,excutor2,..> --flag <flag> --network <network>
```

7.setFee (feeRate - the denominator is 1000000, fixed fee is in wei)

```
npx hardhat setFee --router <router address> --feereceiver <receiver address> --feerate <rate> --fixedfee <fixedfee> --network <network>
```

8.deployAndSetup before run this task, set task/config.js

```
npx hardhat deployAndSetup  --routertype <v2 for butterRouterV2, plus for butterRouterPlus> --network <network>
```

9.deployAggregationAdaptor

```
npx hardhat deployAggregationAdaptor --network <network>
```

10.deployReceiver

```
npx hardhat deployReceiver --router <router address> --network <network>
```

11.receiverSetUp

```
npx hardhat receiverSetUp --receiver <receiver address> --name <name> --router <router> --network <network>
```

name:

cbridge -> setCBridgeMessageBus

amarok -> setAmarokRouter

stargate -> setStargateRouter

butter -> setAuthorization

router is this address for the bridge router
