let { task } = require("hardhat/config");
let {getConfig} = require("./config")

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
        let salt = process.env.DEPLOY_SALT;
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
        let salt = process.env.DEPLOY_SALT;
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
            let salt = process.env.DEPLOY_SALT;
            let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
            console.log("factory :", factory.address);
            console.log("salt:", salt);
            let router_addr = await factory.getAddress(salt_hash);
            let code = await ethers.provider.getCode(router_addr);

            if(code !== '0x'){
                console.log("already deployed router address is :", router_addr);
                return;
            }


            //1 - deploy router v2
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


            //2 - deploy AggregationAdapter
            let AggregationAdapter = await ethers.getContractFactory("AggregationAdapter");
            let executor_salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt_hash));
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
            config.excutors.push(executor_addr)
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


    async function deployReceiver(router,dexExecutor,salt) {
        let [wallet] = await ethers.getSigners();
        let IDeployFactory_abi = [
            "function deploy(bytes32 salt, bytes memory creationCode, uint256 value) external",
            "function getAddress(bytes32 salt) external view returns (address)"
        ]
        let factory_addr = process.env.DEPLOY_FACTORY;
        let factory = await ethers.getContractAt(IDeployFactory_abi, factory_addr, wallet);
        salt = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
        let receiver_addr = await factory.getAddress(salt);
        let code = await ethers.provider.getCode(receiver_addr);

        if(code !== '0x'){
            console.log("already deployed receiver address is :", receiver_addr);
            return;
        }

        let Receiver = await ethers.getContractFactory("Receiver");
        let param = ethers.utils.defaultAbiCoder.encode(['address', 'address'], [router, dexExecutor])
        let create_code = ethers.utils.solidityPack(['bytes', 'bytes'], [Receiver.bytecode, param]);
        let create = await (await factory.deploy(salt_hash, create_code, 0)).wait();
        if (create.status == 1) {
            console.log("Receiver deployed to :", receiver_addr);
            receiver = Receiver.attach(receiver_addr);

            let amarokRouter = "";
            if(amarokRouter && amarokRouter != "" && amarokRouter != ethers.constants.AddressZero){
                let result = await (await receiver.setAmarokRouter(amarokRouter)).wait();
                if(result.status == 1) {
                    console.log("receiver seted amarok router :", amarokRouter);
                } else {
                    console.log("receiver set amarok router fail");
                }
            }

            let sgRouter = "";
            if(sgRouter && sgRouter != "" && sgRouter != ethers.constants.AddressZero){
                result = await (await receiver.setStargateRouter(sgRouter)).wait();
                if(result.status == 1) {
                    console.log("receiver seted Stargate router :", sgRouter);
                } else {
                    console.log("receiver set Stargate router fail");
                }
            }

            let cBridgeMessageBus = "";
            if(cBridgeMessageBus && cBridgeMessageBus != "" && cBridgeMessageBus != ethers.constants.AddressZero){
                result = await (await receiver.setCBridgeMessageBus(cBridgeMessageBus)).wait();
                if(result.status == 1) {
                    console.log("receiver seted CBridgeMessageBus :", cBridgeMessageBus);
                } else {
                    console.log("receiver set CBridgeMessageBus fail");
                }
            }

            let recoverGas = 0;
            if(recoverGas > 0) {
                result = await (await receiver.setRecoverGas(recoverGas)).wait();
                if(result.status == 1) {
                    console.log("receiver seted RecoverGas :", recoverGas);
                } else {
                    console.log("receiver set RecoverGas fail");
                }
            }

        } else {
            console.log("Receiver deploy fail");
            return;
        }
    }