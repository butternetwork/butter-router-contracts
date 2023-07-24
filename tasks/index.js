let { task } = require("hardhat/config");
let {getConfig} = require("./config")
let { Wallet } = require('zksync-web3')
let { HardhatRuntimeEnvironment } = require('hardhat/types') 
let { Deployer } = require('@matterlabs/hardhat-zksync-deploy')
let {updateSelectorInfo,setRouters,setStargatePoolId,setLayerZeroChainId} = require("../utils/helper")

task("deployRouter",
    "deploy butter router contract"
)
    .addParam("mos", "mos address")
    .addParam("core", "butter core address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer)

        let result = await deploy('ButterRouter', {
            from: deployer,
            args: [taskArgs.mos, taskArgs.core],
            log: true,
            contract: 'ButterRouter'
        });

        console.log("router deployed to :", result.address);
    })


task("setMos",
    "set mos address"
)
    .addParam("router", "router address")
    .addParam("mos", "mos address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        let Router = await ethers.getContractFactory("ButterRouter");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setMosAddress(taskArgs.mos)).wait();

        if (result.status == 1) {
            console.log('setMos succeed');
            console.log("new mos address is:", await router.mosAddress());
        } else {
            console.log('create failed');
        }
    })

task("setCore",
    "set mos address"
)
    .addParam("router", "router address")
    .addParam("core", "core address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        let Router = await ethers.getContractFactory("ButterRouter");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setButterCore(taskArgs.core)).wait();

        if (result.status == 1) {
            console.log('setCore succeed');
            console.log("new core address is:", await router.butterCore());
        } else {
            console.log('create failed');
        }
    })


//<---------------------------------------------------------v2----------------------------------------------------------->
task("deployRouterV2",
    "deploy butter router V2 contract"
)
    .addParam("mos", "mos address")
    .addParam("wtoken", "wtoken address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let [wallet] = await ethers.getSigners();
        let IDeployFactory_abi = [
            "function deploy(bytes32 salt, bytes memory creationCode, uint256 value) external",
            "function getAddress(bytes32 salt) external view returns (address)"
        ]
        let factory_addr = process.env.DEPLOY_FACTORY;
        let factory = await ethers.getContractAt(IDeployFactory_abi, factory_addr, wallet);
        let salt = process.env.ROUTER_DEPLOY_SALT;
        let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));

        console.log("factory :", factory.address);
        console.log("salt:", salt);

        let addr = await factory.getAddress(salt_hash);
        let code = await ethers.provider.getCode(addr);
        if (code === '0x') {
            let ButterRouterV2 = await ethers.getContractFactory("ButterRouterV2");
            let param = ethers.utils.defaultAbiCoder.encode(['address', 'address', 'address'], [taskArgs.mos, deployer, taskArgs.wtoken])
            let create_code = ethers.utils.solidityPack(['bytes', 'bytes'], [ButterRouterV2.bytecode, param]);
            let create = await (await factory.deploy(salt_hash, create_code, 0)).wait();

            if (create.status == 1) {
                console.log("router v2 deployed to :", addr);
            } else {
                console.log("deploy fail");
            }
        } else {
            console.log("already deploy. address is :", addr);
        }
        // let result = await deploy('ButterRouterV2', {
        //     from: deployer,
        //     args: [taskArgs.mos, deployer,taskArgs.wtoken],
        //     log: true,
        //     contract: 'ButterRouterV2'
        // });

        // console.log("ButterRouterV2 deployed to :", result.address);

    })

task("deployAggregationAdapter",
    "deploy AggregationAdapter"
)
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let [wallet] = await ethers.getSigners();
        let IDeployFactory_abi = [
            "function deploy(bytes32 salt, bytes memory creationCode, uint256 value) external",
            "function getAddress(bytes32 salt) external view returns (address)"
        ]
        let factory_addr = process.env.DEPLOY_FACTORY;
        let factory = await ethers.getContractAt(IDeployFactory_abi, factory_addr, wallet);
        let salt = process.env.AGG_DEPLOY_SALT;
        salt = ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
        let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));

        console.log("factory :", factory.address);
        console.log("salt:", salt);

        let addr = await factory.getAddress(salt_hash);
        let code = await ethers.provider.getCode(addr);
        if (code === '0x') {
            let AggregationAdapter = await ethers.getContractFactory("AggregationAdapter");
            let param = ethers.utils.defaultAbiCoder.encode(['address'], [wallet.address])
            let create_code = ethers.utils.solidityPack(['bytes', 'bytes'], [AggregationAdapter.bytecode, param]);
            let create = await (await factory.deploy(salt_hash, create_code, 0)).wait();

            if (create.status == 1) {
                console.log("AggregationAdapter deployed to :", addr);
            } else {
                console.log("deploy fail");
            }
        } else {
            console.log("already deploy. address is :", addr);
        }
        // let result = await deploy('DexExecutor', {
        //     from: deployer,
        //     args: [],
        //     log: true,
        //     contract: 'DexExecutor'
        // });

        // console.log("DexExecutor deployed to :", result.address);

    })

task("setV2Mos",
    "set mos address"
)
    .addParam("router", "router address")
    .addParam("mos", "mos address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer);

        let Router = await ethers.getContractFactory("ButterRouterV2");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setMosAddress(taskArgs.mos)).wait();

        if (result.status == 1) {
            console.log('setMos succeed');
            console.log("new mos address is:", await router.mosAddress());
        } else {
            console.log('create failed');
        }
    })


task("setAuthorization",
    "setAuthorization"
)
    .addParam("router", "router address")
    .addParam("executors", "executors address array")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer);

        let executors = taskArgs.executors.split(',');

        if(executors.length < 1){
            console.log("executors is empty ...");
            return;
        }

        let Router = await ethers.getContractFactory("ButterRouterV2");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setAuthorization(executors, taskArgs.flag)).wait();

        if (result.status == 1) {
            console.log(`Router ${router.address} setAuthorization ${executors} succeed`);
        } else {
            console.log('setAuthorization failed');
        }
    })

task("setFee",
    "setFee"
)
    .addParam("router", "router address")
    .addParam("feereceiver", "feeReceiver address")
    .addParam("feerate", "feeRate")
    .addParam("fixedfee", "fixedFee")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer);

        let Router = await ethers.getContractFactory("ButterRouterV2");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setFee(taskArgs.feereceiver, taskArgs.feerate, taskArgs.fixedfee)).wait();

        if (result.status == 1) {
            console.log(`Router ${router.address} setFee rate(${taskArgs.feerate}), fixed(${taskArgs.fixedfee}), receiver(${taskArgs.feereceiver}) succeed`);
        } else {
            console.log('setFee failed');
        }
    })


    task("deployAndSetUp",
    "deployAndSetUp"
         )
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers,network} = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let config = getConfig(network.name);
        if(config){

            console.log("<------------------------ deployAndSetUp begin ---------------------------->")

            let [wallet] = await ethers.getSigners();
            let IDeployFactory_abi = [
                "function deploy(bytes32 salt, bytes memory creationCode, uint256 value) external",
                "function getAddress(bytes32 salt) external view returns (address)"
            ]
            let factory_addr = process.env.DEPLOY_FACTORY;
            let factory = await ethers.getContractAt(IDeployFactory_abi, factory_addr, wallet);
            let salt = process.env.ROUTER_DEPLOY_SALT;
            let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
            console.log("factory :", factory.address);
            console.log("router salt:", salt);
            let router_addr = await factory.getAddress(salt_hash);
            let code = await ethers.provider.getCode(router_addr);

            if(code !== '0x'){
                console.log("already deployed router address is :", router_addr);
                return;
            }


            // 1 - deploy router v2
            let ButterRouterV2 = await ethers.getContractFactory("ButterRouterV2");
            let param = ethers.utils.defaultAbiCoder.encode(['address', 'address', 'address'], [config.mos, deployer, config.wToken])
            let create_code = ethers.utils.solidityPack(['bytes', 'bytes'], [ButterRouterV2.bytecode, param]);
            let create = await (await factory.deploy(salt_hash, create_code, 0)).wait();
            if (create.status == 1) {
                console.log("router v2 deployed to :", router_addr);
            } else {
                console.log("router v2 deploy fail");
                return;
            }


            // 2 - deploy AggregationAdapter
            let AggregationAdapter = await ethers.getContractFactory("AggregationAdapter");
            console.log("agg salt:", process.env.AGG_DEPLOY_SALT);
            let executor_salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(process.env.AGG_DEPLOY_SALT));
            param = ethers.utils.defaultAbiCoder.encode(['address'], [wallet.address])
            let executor_create_code = ethers.utils.solidityPack(['bytes', 'bytes'], [AggregationAdapter.bytecode, param]);;
            let executor_create = await (await factory.deploy(executor_salt_hash, executor_create_code, 0)).wait();
            let executor_addr = await factory.getAddress(executor_salt_hash);
            if (executor_create.status == 1) {
                console.log("AggregationAdapter deployed to :", executor_addr);
            } else {
                console.log("AggregationAdapter deploy fail");
                return;
            }


            //3 - setFee
            let router = ButterRouterV2.attach(router_addr);
            result = await (await router.setFee(config.fee.receiver, config.fee.feeRate, config.fee.fixedFee)).wait();
            if (result.status == 1) {
                console.log(`Router ${router.address} setFee rate(${config.fee.feeRate}), fixed(${config.fee.fixedFee}), receiver(${config.fee.receiver}) succeed`);
            } else {
                console.log('setFee failed');
            }

            //4 - setAuthorization
            config.excutors.push(executor_addr);
            result = await (await router.setAuthorization(config.excutors,true)).wait();
            if (result.status == 1) {
                console.log(`Router ${router.address} setAuthorization ${config.excutors} succeed`);
            } else {
                console.log('setAuthorization failed');
            }

           console.log("<----------------------------- deployAndSetUp ... done ----------------------->");
        } else {
            console.log("config not set ...");
        }
    })


    task("deployAndSetUpZk",
    "deployAndSetUp"
         )
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers,network} = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let config = getConfig(network.name);
        if(config){

            console.log("<------------------------ deployAndSetUp begin ---------------------------->")

            const wallet = new Wallet(process.env.PRIVATE_KEY)
            // Create deployer object and load the artifact of the contract we want to deploy.
            const deployer = new Deployer(hre, wallet)

            // 1 - deploy router v2
            const router_artifact = await deployer.loadArtifact('ButterRouterV2')
            // Deploy this contract. The returned object will be of a `Contract` type,
            // similar to the ones in `ethers`.
            const butterRouter = await deployer.deploy(router_artifact,[config.mos,wallet.address,config.wToken])

            console.log("ButterRouter deployed on :",butterRouter.address);

            // 2 - deploy AggregationAdapter
            const adapt_artifact = await deployer.loadArtifact('AggregationAdapter')
            // Deploy this contract. The returned object will be of a `Contract` type,
            // similar to the ones in `ethers`.
            const adapt = await deployer.deploy(adapt_artifact,[wallet.address])

            console.log("AggregationAdapter deployed on :",adapt.address);

            //3 - setFee
            let ButterRouterV2 = await ethers.getContractFactory("ButterRouterV2");
            let router = ButterRouterV2.attach(butterRouter.address);
            let result = await (await router.setFee(config.fee.receiver, config.fee.feeRate, config.fee.fixedFee)).wait();
            if (result.status == 1) {
                console.log(`Router ${router.address} setFee rate(${config.fee.feeRate}), fixed(${config.fee.fixedFee}), receiver(${config.fee.receiver}) succeed`);
            } else {
                console.log('setFee failed');
            }

            //4 - setAuthorization
            config.excutors.push(adapt.address);
            result = await (await router.setAuthorization(config.excutors,true)).wait();
            if (result.status == 1) {
                console.log(`Router ${router.address} setAuthorization ${config.excutors} succeed`);
            } else {
                console.log('setAuthorization failed');
            }

           console.log("<----------------------------- deployAndSetUp ... done ----------------------->");
        } else {
            console.log("config not set ...");
        }
    })
    // <--------------------------------------------------rubic adapt------------------------------------------------------------->

    task("deployRubicAdapter",
    "deployRubicAdapter" )
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers,network} = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let [wallet] = await ethers.getSigners();
        let IDeployFactory_abi = [
            "function deploy(bytes32 salt, bytes memory creationCode, uint256 value) external",
            "function getAddress(bytes32 salt) external view returns (address)"
        ]
        let factory_addr = process.env.DEPLOY_FACTORY;
        let factory = await ethers.getContractAt(IDeployFactory_abi, factory_addr, wallet);
        let salt = process.env.RUBIC_ADAPTER_SALT;
        console.log("RubicAdapter salt:", salt);
        let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
        let adapter_addr = await factory.getAddress(salt);
        let code = await ethers.provider.getCode(receiver_addr);
        let RubicAdapter = await ethers.getContractFactory("RubicAdapter");
        if(code !== '0x'){
            console.log("already deployed adapter address is :", adapter_addr);
        }else{
            let param = ethers.utils.defaultAbiCoder.encode(['address'], [deployer])
            let create_code = ethers.utils.solidityPack(['bytes', 'bytes'], [RubicAdapter.bytecode, param]);
            let create = await (await factory.deploy(salt_hash, create_code, 0)).wait();
            if (create.status == 1) {
                console.log("adapter deployed to :", receiver_addr);
            } else {
                console.log("adapter deployed fail");
                return;
            }
        }

        let adapter = RubicAdapter.attach(adapter_addr);
        await updateSelectorInfo(adapter.address,network);
        await setRouters(adapter.address,network);
        await setStargatePoolId(adapter.address,network);
        await setLayerZeroChainId(adapter.address,network);

        console.log("done ...........")
    })


    // <--------------------------------------------------receiver------------------------------------------------------------->
   
   
    task("deployReceiver",
    "deployReceiver"
         )
    .addParam("router", "router address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers,network} = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let [wallet] = await ethers.getSigners();
        let IDeployFactory_abi = [
            "function deploy(bytes32 salt, bytes memory creationCode, uint256 value) external",
            "function getAddress(bytes32 salt) external view returns (address)"
        ]
        let factory_addr = process.env.DEPLOY_FACTORY;
        let factory = await ethers.getContractAt(IDeployFactory_abi, factory_addr, wallet);
        let salt = process.env.RECEIVER_DEPLOY_SALT;
        console.log("receiver salt:", salt);
        let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
        let receiver_addr = await factory.getAddress(salt);
        let code = await ethers.provider.getCode(receiver_addr);

        if(code !== '0x'){
            console.log("already deployed receiver address is :", receiver_addr);
            return;
        }
        let Receiver = await ethers.getContractFactory("Receiver");
        let param = ethers.utils.defaultAbiCoder.encode(['address', 'address'], [taskArgs.router, wallet.address])
        let create_code = ethers.utils.solidityPack(['bytes', 'bytes'], [Receiver.bytecode, param]);
        let create = await (await factory.deploy(salt_hash, create_code, 0)).wait();
        if (create.status == 1) {
            console.log("Receiver deployed to :", receiver_addr);
        } else {
            console.log("Receiver deployed fail");
        }
    })

    task("setStargateRouter",
    "setStargateRouter"
         )
    .addParam("receiver", "receiver address")
    .addParam("stargate", "stargate router address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers,network} = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let Receiver = await ethers.getContractFactory("Receiver");
        let receiver = Receiver.attach(taskArgs.receiver);
        let result = await (await receiver.setStargateRouter(taskArgs.stargate)).wait();
        if(result.status == 1) {
            console.log("receiver seted stargate router :", taskArgs.stargate);
        } else {
            console.log("receiver set stargate router fail");
        }
    })

    task("setAmarokRouter",
    "setAmarokRouter"
         )
    .addParam("receiver", "receiver address")
    .addParam("amarok", "amarok router address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers,network} = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let Receiver = await ethers.getContractFactory("Receiver");
        let receiver = Receiver.attach(taskArgs.receiver);
        let result = await (await receiver.setAmarokRouter(taskArgs.amarok)).wait();
        if(result.status == 1) {
            console.log("receiver seted amarok router :", taskArgs.amarok);
        } else {
            console.log("receiver set amarok router fail");
        }
    })

    task("setCBridgeMessageBus",
    "setCBridgeMessageBus"
         )
    .addParam("receiver", "receiver address")
    .addParam("cbridge", "cbridge MessageBus address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers,network} = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let Receiver = await ethers.getContractFactory("Receiver");
        let receiver = Receiver.attach(taskArgs.receiver);
        let result = await (await receiver.setCBridgeMessageBus(taskArgs.cbridge)).wait();
        if(result.status == 1) {
            console.log("receiver seted cbridge MessageBus :", taskArgs.cbridge);
        } else {
            console.log("receiver set cbridge MessageBus fail");
        }
    })

    task("setButter",
    "setButter"
         )
    .addParam("receiver", "receiver address")
    .addParam("butter", "butter router address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers,network} = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        console.log("deployer :", deployer);
        let Receiver = await ethers.getContractFactory("Receiver");
        let receiver = Receiver.attach(taskArgs.receiver);
        let result = await (await receiver.setAuthorization(taskArgs.butter)).wait();
        if(result.status == 1) {
            console.log("receiver seted butter router :", taskArgs.butter);
        } else {
            console.log("receiver set butter router fail");
        }
    })
