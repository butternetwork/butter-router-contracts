const { getContract, getDeploy, saveDeploy, createDeployer } = require("../utils/helper.js");

task("AffiliateFeeManager:deploy", "deploy AffiliateFeeManager").setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const [deployer] = await ethers.getSigners();
    console.log("deployer address is:", deployer.address);

    let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
    let impl = await AffiliateFeeManager.deploy();
    await impl.waitForDeployment();
    let implAddr = await impl.getAddress();

    let ButterProxy = await ethers.getContractFactory("ButterProxy");
    let data = AffiliateFeeManager.interface.encodeFunctionData("initialize", [deployer.address]);
    let proxy = await ButterProxy.deploy(implAddr, data);
    await proxy.waitForDeployment();
    let proxyAddr = await proxy.getAddress();

    console.log("AffiliateFeeManager proxy:", proxyAddr);
    await saveDeploy(network.name, "AffiliateFeeManager", proxyAddr);
});

task("AffiliateFeeManager:setExecutorAndSwap", "setExecutorAndSwap")
    .addParam("excutor", "relay executor address")
    .addParam("swap", "swap address")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "AffiliateFeeManager");
        if (!addr) throw "AffiliateFeeManager not deployed";

        let c = await getContract("AffiliateFeeManager", hre, addr);
        console.log("pre swap address is:", await c.swap());
        console.log("pre excutor address is:", await c.relayExecutor());
        await (await c.setExecutorAndSwap(taskArgs.excutor, taskArgs.swap)).wait();
        console.log("after swap address is:", await c.swap());
        console.log("after excutor address is:", await c.relayExecutor());
    });

task("AffiliateFeeManager:setMaxAffiliateFee", "setMaxAffiliateFee")
    .addParam("max", "Max Affiliate Fee")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "AffiliateFeeManager");
        if (!addr) throw "AffiliateFeeManager not deployed";

        let c = await getContract("AffiliateFeeManager", hre, addr);
        console.log("pre maxAffiliateFee is:", await c.maxAffiliateFee());
        await (await c.setMaxAffiliateFee(taskArgs.max)).wait();
        console.log("after maxAffiliateFee is:", await c.maxAffiliateFee());
    });

task("AffiliateFeeManager:triggleRegisterWhitelist", "triggleRegisterWhitelist").setAction(async (taskArgs, hre) => {
    const { network } = hre;
    let addr = await getDeploy(network.name, "AffiliateFeeManager");
    if (!addr) throw "AffiliateFeeManager not deployed";

    let c = await getContract("AffiliateFeeManager", hre, addr);
    console.log(`pre Register whitelist status: ${await c.isRegisterNeedWhitelist()}`);
    await (await c.triggleRegisterWhitelist()).wait();
    console.log(`after Register whitelist status: ${await c.isRegisterNeedWhitelist()}`);
});

task("AffiliateFeeManager:updateWhitelist", "updateWhitelist")
    .addParam("wallet", "wallet address")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "AffiliateFeeManager");
        if (!addr) throw "AffiliateFeeManager not deployed";

        let c = await getContract("AffiliateFeeManager", hre, addr);
        console.log(`address ${taskArgs.wallet} pre whitelist status:`, await c.whitelist(taskArgs.wallet));
        await (await c.updateWhitelist(taskArgs.wallet, taskArgs.flag)).wait();
        console.log(`address ${taskArgs.wallet} after whitelist status:`, await c.whitelist(taskArgs.wallet));
    });

task("AffiliateFeeManager:updateRegisterFee", "updateRegisterFee")
    .addParam("fee", "fee amount")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "AffiliateFeeManager");
        if (!addr) throw "AffiliateFeeManager not deployed";

        let c = await getContract("AffiliateFeeManager", hre, addr);
        console.log("pre registerFee:", await c.registerFee());
        await (await c.updateRegisterFee(taskArgs.fee)).wait();
        console.log("after registerFee:", await c.registerFee());
    });

task("AffiliateFeeManager:adminRegister", "admin Register")
    .addParam("wallet", "wallet address")
    .addParam("nickname", "nickname")
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "AffiliateFeeManager");
        if (!addr) throw "AffiliateFeeManager not deployed";

        let c = await getContract("AffiliateFeeManager", hre, addr);
        await (await c.adminRegister(taskArgs.wallet, taskArgs.nickname)).wait();
        console.log(await c.getInfoByWallet(taskArgs.wallet));
    });

task("AffiliateFeeManager:grantRole", "grantRole")
    .addParam("role", "role name: upgrade | manage | default")
    .addParam("user", "user address")
    .addOptionalParam("flag", "flag, default: true", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network } = hre;
        let addr = await getDeploy(network.name, "AffiliateFeeManager");
        if (!addr) throw "AffiliateFeeManager not deployed";

        let c = await getContract("AffiliateFeeManager", hre, addr);
        let role;
        if (taskArgs.role === "upgrade") {
            role = await c.UPGRADER_ROLE();
        } else if (taskArgs.role === "manage") {
            role = await c.MANAGER_ROLE();
        } else {
            role = await c.DEFAULT_ADMIN_ROLE();
        }

        if (taskArgs.flag) {
            await (await c.grantRole(role, taskArgs.user)).wait();
        } else {
            await (await c.revokeRole(role, taskArgs.user)).wait();
        }
        console.log(`${taskArgs.user} has ${taskArgs.role} role`, await c.hasRole(role, taskArgs.user));
    });

task("AffiliateFeeManager:upgrade", "upgrade AffiliateFeeManager impl").setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const [deployer] = await ethers.getSigners();
    console.log("deployer address is:", deployer.address);

    let AffiliateFeeManager = await ethers.getContractFactory("AffiliateFeeManager");
    let impl = await AffiliateFeeManager.deploy();
    await impl.waitForDeployment();
    let implAddr = await impl.getAddress();

    let addr = await getDeploy(network.name, "AffiliateFeeManager");
    if (!addr) throw "AffiliateFeeManager not deployed";

    let c = await getContract("AffiliateFeeManager", hre, addr);
    console.log("pre impl is:", await c.getImplementation());
    await (await c.upgradeTo(implAddr)).wait();
    console.log("after impl is:", await c.getImplementation());

    // Verify the new implementation
    await createDeployer(hre, { autoVerify: true }).verify(implAddr, []);
});
