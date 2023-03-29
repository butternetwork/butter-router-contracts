let { task } = require("hardhat/config");

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

        let Router = await ethers.getContractFactory("ButterRouterBsc");

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
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        let Router = await ethers.getContractFactory("ButterRouterBsc");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setButterCore(taskArgs.core)).wait();

        if (result.status == 1) {
            console.log('setMos succeed');
            console.log("new core address is:", await router.mosAddress());
        } else {
            console.log('create failed');
        }
    })


//<---------------------------------------------------------v2----------------------------------------------------------->
task("deployRouterV2",
    "deploy butter router V2 contract"
)
    .addParam("mos", "mos address")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        console.log("deployer :", deployer)

        let result = await deploy('ButterRouterV2', {
            from: deployer,
            args: [taskArgs.mos],
            log: true,
            contract: 'ButterRouterV2'
        });

        console.log("router v2 deployed to :", result.address);
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
    "set mos address"
)
    .addParam("router", "router address")
    .addParam("excutor", "excutor address")
    .addParam("flag", "flag")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        let Router = await ethers.getContractFactory("ButterRouterV2");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setAuthorization(taskArgs.excutor, taskArgs.flag)).wait();

        if (result.status == 1) {
            console.log('setAuthorization succeed');
        } else {
            console.log('setAuthorization failed');
        }
    })

task("setFee",
    "set mos address"
)
    .addParam("router", "router address")
    .addParam("feereceiver", "feeReceiver address")
    .addParam("feerate", "feeRate")
    .setAction(async (taskArgs, hre) => {
        const { deployments, getNamedAccounts, ethers } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        let Router = await ethers.getContractFactory("ButterRouterV2");

        let router = Router.attach(taskArgs.router);

        let result = await (await router.setFee(taskArgs.feereceiver, taskArgs.feerate)).wait();

        if (result.status == 1) {
            console.log('setFee succeed');
        } else {
            console.log('setFee failed');
        }
    })