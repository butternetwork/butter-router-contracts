
let { saveDeployment, getDeployment } = require("../../utils/helper.js")

task("ButterAffiliateFeeExecutor:deploy", "deploy ButterAffiliateFeeExecutor")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
        let ButterAffiliateFeeExecutor = await ethers.getContractFactory("ButterAffiliateFeeExecutor");
        let impl = await ButterAffiliateFeeExecutor.deploy();
        await impl.deployed();
        let ButterProxy = await ethers.getContractFactory("ButterProxy");
        let data = ButterAffiliateFeeExecutor.interface.encodeFunctionData("initialize", [deployer.address]);
    
        let butterAffiliateFeeExecutor = await ButterProxy.deploy(impl.address, data);
        await butterAffiliateFeeExecutor.deployed()
        await saveDeployment(network.name, "ButterAffiliateFeeExecutor", butterAffiliateFeeExecutor.address);
    });

task("ButterAffiliateFeeExecutor:setFlashSwapAndRelay", "setFlashSwapAndRelay")
    .addParam("relay", "relay address")
    .addParam("swap", "swap address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);

        let ButterAffiliateFeeExecutor = await ethers.getContractFactory("ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor_address = getDeployment(network.name, "ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor = ButterAffiliateFeeExecutor.attach(butterAffiliateFeeExecutor_address);
        console.log("pre swap address is：", await butterAffiliateFeeExecutor.swap());
        console.log("pre relay address is：", await butterAffiliateFeeExecutor.relay());
        await (await butterAffiliateFeeExecutor.setFlashSwapAndRelay(taskArgs.swap, taskArgs.relay)).wait()
        console.log("after swap address is：", await butterAffiliateFeeExecutor.swap());
        console.log("after relay address is：", await butterAffiliateFeeExecutor.relay());
    });

task("ButterAffiliateFeeExecutor:setMaxAffiliateFee", "setMaxAffiliateFee")
    .addParam("max", "Max Affiliate Fee")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);

        let ButterAffiliateFeeExecutor = await ethers.getContractFactory("ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor_address = getDeployment(network.name, "ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor = ButterAffiliateFeeExecutor.attach(butterAffiliateFeeExecutor_address);
        console.log("pre maxAffiliateFee is：", await butterAffiliateFeeExecutor.maxAffiliateFee());
        await (await butterAffiliateFeeExecutor.setMaxAffiliateFee(taskArgs.max)).wait()
        console.log("after maxAffiliateFee is：", await butterAffiliateFeeExecutor.maxAffiliateFee());
    });

task("ButterAffiliateFeeExecutor:register", "setMaxAffiliateFee")
    .addParam("receiver", "receiver address")
    .addParam("max", "receiver address")
    .addParam("min", "receiver address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
        let ButterAffiliateFeeExecutor = await ethers.getContractFactory("ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor_address = getDeployment(network.name, "ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor = ButterAffiliateFeeExecutor.attach(butterAffiliateFeeExecutor_address);
        await (await butterAffiliateFeeExecutor.register(taskArgs.receiver, taskArgs.max, taskArgs.min)).wait()
        let currentRegisterId = await butterAffiliateFeeExecutor.currentRegisterId();
        console.log(await butterAffiliateFeeExecutor.affiliates(currentRegisterId));
    });

task("ButterAffiliateFeeExecutor:update", "update")
    .addParam("id", "Affiliate id")
    .addParam("receiver", "receiver address")
    .addParam("max", "receiver address")
    .addParam("min", "receiver address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
        let ButterAffiliateFeeExecutor = await ethers.getContractFactory("ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor_address = getDeployment(network.name, "ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor = ButterAffiliateFeeExecutor.attach(butterAffiliateFeeExecutor_address);
        console.log("pre :", await butterAffiliateFeeExecutor.affiliates(taskArgs.id));
        await (await butterAffiliateFeeExecutor.register(taskArgs.id, taskArgs.receiver, taskArgs.max, taskArgs.min)).wait()
        console.log("after :", await butterAffiliateFeeExecutor.affiliates(taskArgs.id));
    });

task("ButterAffiliateFeeExecutor:grantRole", "grantRole")
    .addParam("role", "Affiliate id")
    .addParam("user", "user address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
        let ButterAffiliateFeeExecutor = await ethers.getContractFactory("ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor_address = getDeployment(network.name, "ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor = ButterAffiliateFeeExecutor.attach(butterAffiliateFeeExecutor_address);
        let role;
        if(taskArgs.role === "upgrade"){
          role = await c.UPGRADER_ROLE()
        } else if(taskArgs.role === "manage"){
          role = await c.MANAGER_ROLE()
        } else if(taskArgs.role === "retry"){
          role = await c.RETRY_ROLE()
        } else{
          role = await c.DEFAULT_ADMIN_ROLE()
        }
        await (await butterAffiliateFeeExecutor.grantRole(role, taskArgs.user)).wait();

        console.log(`${taskArgs.user} has ${taskArgs.role} role`, await butterAffiliateFeeExecutor.hasRole(role, taskArgs.user));
    });

task("ButterAffiliateFeeExecutor:upgrade", "deploy butterRouterV2")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer address is:", deployer.address);
    
        let ButterAffiliateFeeExecutor = await ethers.getContractFactory("ButterAffiliateFeeExecutor");
        let impl = await ButterAffiliateFeeExecutor.deploy(deployer.address);
        await impl.deployed();
        let butterAffiliateFeeExecutor_address = getDeployment(network.name, "ButterAffiliateFeeExecutor");
        let butterAffiliateFeeExecutor = ButterAffiliateFeeExecutor.attach(butterAffiliateFeeExecutor_address);
        console.log("pre impl is：", await butterAffiliateFeeExecutor.getImplementation());
        await (await butterAffiliateFeeExecutor.upgradeTo(impl.address)).wait()
        console.log("after impl is：", await butterAffiliateFeeExecutor.getImplementation());
    });
