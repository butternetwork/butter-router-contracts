let { saveDeployment, getDeployment } = require("../../utils/helper.js");
let { verify } = require("../../utils/verify.js");

task("AffiliateFeeManager:deploy", "deploy AffiliateFeeManager").setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer address is:", deployer.address);
    let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
    let impl = await AffiliateFeeManager.deploy();
    await impl.deployed();
    let ButterProxy = await ethers.getContractFactory("ButterProxy");
    let data = AffiliateFeeManager.interface.encodeFunctionData("initialize", [deployer.address]);
    let affiliateFeeManager = await ButterProxy.deploy(impl.address, data);
    await affiliateFeeManager.deployed();
    await saveDeployment(network.name, "AffiliateFeeManager", affiliateFeeManager.address);
});

task("AffiliateFeeManager:setExecutorAndSwap", "setExecutorAndSwap")
    .addParam("excutor", "relay address")
    .addParam("swap", "swap address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);

        let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
        let affiliateFeeManager_address = getDeployment(network.name, "AffiliateFeeManager");
        let affiliateFeeManager = AffiliateFeeManager.attach(affiliateFeeManager_address);
        console.log("pre swap address is：", await affiliateFeeManager.swap());
        console.log("pre excutor address is：", await affiliateFeeManager.relayExecutor());
        await (await affiliateFeeManager.setExecutorAndSwap(taskArgs.excutor, taskArgs.swap)).wait();
        console.log("after swap address is：", await affiliateFeeManager.swap());
        console.log("after excutor address is：", await affiliateFeeManager.relayExecutor());
    });

task("AffiliateFeeManager:setMaxAffiliateFee", "setMaxAffiliateFee")
    .addParam("max", "Max Affiliate Fee")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);

        let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
        let affiliateFeeManager_address = getDeployment(network.name, "AffiliateFeeManager");
        let affiliateFeeManager = AffiliateFeeManager.attach(affiliateFeeManager_address);
        console.log("pre maxAffiliateFee is：", await affiliateFeeManager.maxAffiliateFee());
        await (await affiliateFeeManager.setMaxAffiliateFee(taskArgs.max)).wait();
        console.log("after maxAffiliateFee is：", await affiliateFeeManager.maxAffiliateFee());
    });

task("AffiliateFeeManager:triggleRegisterWhitelist", "triggleRegisterWhitelist").setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer address is:", deployer.address);
    let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
    let affiliateFeeManager_address = getDeployment(network.name, "AffiliateFeeManager");
    let affiliateFeeManager = ButterAffiliateFeeExecutor.attach(affiliateFeeManager_address);
    console.log(`pre Register whitelist status: ${await affiliateFeeManager.isRegisterNeedWhitelist()}`);
    await (await affiliateFeeManager.triggleRegisterWhitelist()).wait();
    console.log(`after Register whitelist status: ${await affiliateFeeManager.isRegisterNeedWhitelist()}`);
});

task("AffiliateFeeManager:updateWhitelist", "updateWhitelist")
    .addParam("wallet", "Affiliate id")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
        let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
        let affiliateFeeManager_address = getDeployment(network.name, "AffiliateFeeManager");
        let affiliateFeeManager = AffiliateFeeManager.attach(affiliateFeeManager_address);
        console.log(
            `address ${taskArgs.wallet} pre whitelist status :`,
            await affiliateFeeManager.whitelist(taskArgs.wallet)
        );
        await (await affiliateFeeManager.updateWhitelist(taskArgs.wallet, taskArgs.flag)).wait();
        console.log(
            `address ${taskArgs.wallet} after whitelist status :`,
            await affiliateFeeManager.whitelist(taskArgs.wallet)
        );
    });

task("AffiliateFeeManager:updateRegisterFee", "admin Register")
    .addParam("fee", "fee amount")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
        let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
        let affiliateFeeManager_address = getDeployment(network.name, "AffiliateFeeManager");
        let affiliateFeeManager = AffiliateFeeManager.attach(affiliateFeeManager_address);
        console.log("pre registerFee: ", await affiliateFeeManager.registerFee());
        await (await affiliateFeeManager.updateRegisterFee(taskArgs.fee)).wait();
        console.log("after registerFee: ", await affiliateFeeManager.registerFee());
    });

task("AffiliateFeeManager:adminRegister", "admin Register")
    .addParam("wallet", "Affiliate id")
    .addParam("nickname", "nickname")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
        let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
        let affiliateFeeManager_address = getDeployment(network.name, "AffiliateFeeManager");
        let affiliateFeeManager = AffiliateFeeManager.attach(affiliateFeeManager_address);
        await (await affiliateFeeManager.adminRegister(taskArgs.wallet, taskArgs.nickname)).wait();
        console.log(await affiliateFeeManager.getInfoByWallet(taskArgs.wallet));
    });

task("AffiliateFeeManager:grantRole", "grantRole")
    .addParam("role", "Affiliate id")
    .addParam("user", "user address")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
        let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
        let affiliateFeeManager_address = getDeployment(network.name, "AffiliateFeeManager");
        let affiliateFeeManager = AffiliateFeeManager.attach(affiliateFeeManager_address);
        let role;
        if (taskArgs.role === "upgrade") {
            role = await affiliateFeeManager.UPGRADER_ROLE();
        } else if (taskArgs.role === "manage") {
            role = await affiliateFeeManager.MANAGER_ROLE();
        } else {
            role = await affiliateFeeManager.DEFAULT_ADMIN_ROLE();
        }

        if (taskArgs.flag) {
            await (await affiliateFeeManager.grantRole(role, taskArgs.user)).wait();
        } else {
            await (await affiliateFeeManager.revokeRole(role, taskArgs.user)).wait();
        }
        console.log(
            `${taskArgs.user} has ${taskArgs.role} role`,
            await affiliateFeeManager.hasRole(role, taskArgs.user)
        );
    });

task("AffiliateFeeManager:upgrade", "deploy butterRouterV2").setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer address is:", deployer.address);

    let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
    let impl = await AffiliateFeeManager.deploy();
    await impl.deployed();
    let affiliateFeeManager_address = getDeployment(network.name, "AffiliateFeeManager");
    let affiliateFeeManager = AffiliateFeeManager.attach(affiliateFeeManager_address);
    console.log("pre impl is：", await affiliateFeeManager.getImplementation());
    await (await affiliateFeeManager.upgradeTo(impl.address)).wait();
    console.log("after impl is：", await affiliateFeeManager.getImplementation());

    await verify(
        impl.address,
        [],
        "contracts/affiliate/AffiliateFeeManager.sol:AffiliateFeeManager",
        network.config.chainId,
        true
    );
});
