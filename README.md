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

set mos

```
npx hardhat setMos --router <router address> --mos  <mos address> --network <network>
```

set core 

```
npx hardhat setCore --router <router address> --core  <core address >--network <network>
```
