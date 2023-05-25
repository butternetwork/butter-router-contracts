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

task("deployDexExecutor",
    "deploy DexExecutor"
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
            let DexExecutor = await ethers.getContractFactory("DexExecutor");
            let create_code = DexExecutor.bytecode;
            let create = await (await factory.deploy(salt_hash, create_code, 0)).wait();

            if (create.status == 1) {
                console.log("DexExecutor deployed to :", addr);
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

task("setDexExecutor",
    "set DexExecutor"
)
    .addParam("router", "router address")
    .addParam("executor", "executor address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer);

        let Router = await ethers.getContractFactory("ButterRouterV2");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setDexExecutor(taskArgs.executor)).wait();

        if (result.status == 1) {
            console.log('setDexExecutor succeed');
            console.log("new executor address is:", await router.dexExecutor());
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


            //2 - deploy DexExecutor
            let DexExecutor = await ethers.getContractFactory("DexExecutor");
            let executor_salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt_hash));
            let executor_create_code = DexExecutor.bytecode;
            let executor_create = await (await factory.deploy(executor_salt_hash, executor_create_code, 0)).wait();
            let executor_addr = await factory.getAddress(executor_salt_hash);
            if (executor_create.status == 1) {
                console.log("dexExecutor v2 deployed to :", executor_addr);
            } else {
                console.log("dexExecutor deploy fail");
                return;
            }


            //3 - setDexExecutor 
            let router = ButterRouterV2.attach(router_addr);
            let result = await (await router.setDexExecutor(executor_addr)).wait();

            if(result.status == 1){
                console.log('setDexExecutor succeed');
                console.log("new executor address is:", await router.dexExecutor());
            }else{
                console.log('setDexExecutor fail');
            }


            //4 - setFee
            result = await (await router.setFee(config.fee.receiver, config.fee.feeRate, config.fee.fixedFee)).wait();
            if (result.status == 1) {
                console.log(`Router ${router.address} setFee rate(${config.fee.feeRate}), fixed(${config.fee.fixedFee}), receiver(${config.fee.receiver}) succeed`);
            } else {
                console.log('setFee failed');
            }


            //5 - setAuthorization
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