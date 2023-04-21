# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```

deploy

```
npx hardhat deployRouter --mos <mos address> --core <core address> --network <network>
```

deploy v2

```
npx hardhat deployRouterV2 --mos <mos address>  --wtoken <wtoken address> --network <network>
```

deployDexExecutor

```
npx hardhat deployDexExecutor --network <network>
```

setDexExecutor

```
npx hardhat setDexExecutor --router <router address> --executor <executor address> --network <network>
```

set mos

```
npx hardhat setMos --router <router address> --mos  <mos address> --network <network>
```

setV2Mos

```
npx hardhat setV2Mos --router <router address> --mos  <mos address> --network <network>
```

v2 setAuthorization  (approve flag true  Indicates that it can be called to swap)

```
npx hardhat setAuthorization --router <router address> --excutor <excutor address> --flag <flag> --network <network>
```

v2 setFee  feeRate   the denominator is 1000000  fixedfee is in wei

```
npx hardhat setFee --router <router address> --feereceiver <feeReceiver address> --feerate <feeRate> --fixedfee <fixedFee> --network <network>
```

set core

```
npx hardhat setCore --router <router address> --core  <core address >--network <network>
```
