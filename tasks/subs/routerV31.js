let { create, getTronContract, getTronDeployer } = require("../../utils/create.js");
let { getDeployment, saveDeployment, tronAddressToHex } = require("../../utils/helper.js");
let { getConfig } = require("../../configs/config");
let {
    setAuthorization,
    setBridge,
    setOwner,
    acceptOwnership,
    getExecutorList,
    checkAuthorization,
    checkBridgeAndWToken,
    removeAuthFromConfig,
    checkFee,
} = require("../common/common.js");
let { verify } = require("../../utils/verify.js");

async function getRouterAddress(router, network) {
    if (!router || router === "") {
        router = await getDeployment(network, "ButterRouterV31");
        if (!router) router = await getDeployment(network, "ButterRouterV3");
    }
    return router;
}

module.exports = async (taskArgs, hre) => {
    const { network } = hre;
    let config = getConfig(network.name);
    if (!config) {
        throw "config not set";
    }

    // Deploy ButterRouterV31 contract
    await hre.run("routerV31:deploy", { bridge: config.v3.bridge, wtoken: config.wToken });
    let router_addr = await getDeployment(network.name, "ButterRouterV31");

    // Deploy SwapAdapter if needed
    let adapt_addr = await getDeployment(network.name, "SwapAdapterV3");
    if (!adapt_addr) {
        console.log("SwapAdapterV3 not found, deploying...");
        await hre.run("deploySwapAdapter");
        adapt_addr = await getDeployment(network.name, "SwapAdapterV3");
    }

    // Add SwapAdapter to executors list
    config.v3.executors.push(adapt_addr);
    let executors_s = config.v3.executors.join(",");

    // Set up router configuration
    await hre.run("routerV31:setAuthorization", { router: router_addr, executors: executors_s });
    await hre.run("routerV31:setFee", {
        router: router_addr,
        feereceiver: config.v3.fee.receiver,
        feerate: config.v3.fee.routerFeeRate,
        fixedfee: config.v3.fee.routerFixedFee,
    });
    await hre.run("routerV31:setReferrerMaxFee", {
        router: router_addr,
        rate: config.v3.fee.maxReferrerFeeRate,
        native: config.v3.fee.maxReferrerNativeFee,
    });

    console.log("ButterRouterV31 deployment and setup completed successfully!");
};

task("routerV31:deploy", "Deploy ButterRouterV31 contract")
    .addParam("bridge", "Bridge contract address")
    .addParam("wtoken", "Wrapped token address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let deployer_address;
        let bridge;
        let wtoken;

        if (network.name === "Tron" || network.name === "TronTest") {
            bridge = tronAddressToHex(taskArgs.bridge);
            wtoken = tronAddressToHex(taskArgs.wtoken);
            deployer_address = await getTronDeployer(true, network.name);
        } else {
            deployer_address = deployer.address;
            bridge = taskArgs.bridge;
            wtoken = taskArgs.wtoken;
        }

        let salt = process.env.ROUTER_V31_DEPLOY_SALT;
        let routerAddr = await create(
            hre,
            deployer,
            "ButterRouterV31",
            ["address", "address", "address"],
            [bridge, deployer_address, wtoken],
            salt
        );

        console.log("ButterRouterV31 address:", routerAddr);
        await saveDeployment(network.name, "ButterRouterV31", routerAddr);

        await verify(
            routerAddr,
            [bridge, deployer_address, wtoken],
            "contracts/ButterRouterV31.sol:ButterRouterV31",
            network.config.chainId,
            true
        );
    });

task("routerV31:setAuthorization", "Set executor authorization for ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("executors", "Comma-separated executor addresses")
    .addOptionalParam("flag", "Authorization flag", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer:", deployer.address);

        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let list = await getExecutorList(network.name, taskArgs.executors);
        await setAuthorization("ButterRouterV31", hre.artifacts, network.name, router_addr, list, taskArgs.flag);
    });

task("routerV31:setFeeManager", "Set fee manager for ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("manager", "Fee manager address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);

        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer:", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV31", hre.artifacts, network.name, router_addr);
            await c.setFeeManager(tronAddressToHex(taskArgs.manager)).send();
        } else {
            console.log("setFeeManager deployer:", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV31");
            let router = Router.attach(router_addr);
            let result = await (await router.setFeeManager(taskArgs.manager)).wait();
            if (result.status == 1) {
                console.log(`ButterRouterV31 ${router.address} setFeeManager ${taskArgs.manager} succeed`);
            } else {
                console.log("setFeeManager failed");
            }
        }
    });

task("routerV31:setReferrerMaxFee", "Set maximum referrer fee for ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("rate", "Maximum fee rate")
    .addParam("native", "Maximum native fee")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);

        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer:", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV31", hre.artifacts, network.name, router_addr);
            await c.setReferrerMaxFee(taskArgs.rate, taskArgs.native).send();
        } else {
            console.log("setReferrerMaxFee deployer:", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV31");
            let router = Router.attach(router_addr);
            await (await router.setReferrerMaxFee(taskArgs.rate, taskArgs.native)).wait();
            console.log(`ButterRouterV31 ${router_addr} setReferrerMaxFee rate(${taskArgs.rate}), native(${taskArgs.native}) succeed`);
        }
    });

task("routerV31:setFee", "Set router fees for ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("feereceiver", "Fee receiver address")
    .addParam("feerate", "Fee rate")
    .addParam("fixedfee", "Fixed fee amount")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);

        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer:", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV31", hre.artifacts, network.name, router_addr);
            await c.setFee(tronAddressToHex(taskArgs.feereceiver), taskArgs.feerate, taskArgs.fixedfee).send();
        } else {
            console.log("setFee deployer:", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV31");
            let router = Router.attach(router_addr);
            let result = await (await router.setFee(taskArgs.feereceiver, taskArgs.feerate, taskArgs.fixedfee)).wait();
            if (result.status == 1) {
                console.log(
                    `ButterRouterV31 ${router_addr} setFee rate(${taskArgs.feerate}), fixed(${taskArgs.fixedfee}), receiver(${taskArgs.feereceiver}) succeed`
                );
            } else {
                console.log("setFee failed");
            }
        }
    });

task("routerV31:setBridge", "Set bridge address for ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("bridge", "Bridge contract address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer:", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);

        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer:", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV31", hre.artifacts, network.name, router_addr);
            await c.setBridgeAddress(tronAddressToHex(taskArgs.bridge)).send();
        } else {
            console.log("setBridge deployer:", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV31");
            let router = Router.attach(router_addr);
            let result = await (await router.setBridgeAddress(taskArgs.bridge)).wait();
            if (result.status == 1) {
                console.log(`ButterRouterV31 ${router_addr} setBridgeAddress ${taskArgs.bridge} succeed`);
            } else {
                console.log("setBridgeAddress failed");
            }
        }
    });

task("routerV31:approveToken", "Approve token spending for ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("token", "Token address")
    .addParam("spender", "Spender address")
    .addOptionalParam("amount", "Approval amount", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);

        // Use max uint256 if amount is not provided
        let amount = taskArgs.amount || ethers.constants.MaxUint256;

        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer:", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV31", hre.artifacts, network.name, router_addr);
            await c.approveToken(tronAddressToHex(taskArgs.token), tronAddressToHex(taskArgs.spender), amount).send();
        } else {
            console.log("approveToken deployer:", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV31");
            let router = Router.attach(router_addr);
            let result = await (await router.approveToken(taskArgs.token, taskArgs.spender, amount)).wait();
            if (result.status == 1) {
                console.log(`ButterRouterV31 ${router_addr} approveToken ${taskArgs.token} to ${taskArgs.spender} amount ${amount} succeed`);
            } else {
                console.log("approveToken failed");
            }
        }
    });

task("routerV31:editFuncBlackList", "Edit function blacklist for ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("func", "Function selector (4 bytes)")
    .addParam("flag", "Blacklist flag (true/false)")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);

        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer:", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV31", hre.artifacts, network.name, router_addr);
            await c.editFuncBlackList(taskArgs.func, taskArgs.flag).send();
        } else {
            console.log("editFuncBlackList deployer:", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV31");
            let router = Router.attach(router_addr);
            let result = await (await router.editFuncBlackList(taskArgs.func, taskArgs.flag)).wait();
            if (result.status == 1) {
                console.log(`ButterRouterV31 ${router_addr} editFuncBlackList ${taskArgs.func} flag ${taskArgs.flag} succeed`);
            } else {
                console.log("editFuncBlackList failed");
            }
        }
    });

task("routerV31:setOwner", "Transfer ownership of ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("owner", "New owner address")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer:", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        await setOwner("ButterRouterV31", hre.artifacts, network.name, router_addr, taskArgs.owner);
    });

task("routerV31:approve", "Approve ButterRouterV31 to Bridge")
  .addOptionalParam("router", "Router address", "", types.string)
  .addParam("token", "Token address")
  .addParam("amount", "Token amount")
  .setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    let router_addr = await getRouterAddress(taskArgs.router, network.name);
    let config = getConfig(network.name);
    if (!config) {
      throw "config not set";
    }

    if (network.name === "Tron" || network.name === "TronTest") {
      console.log("deployer:", await getTronDeployer(false, network.name));
      let c = await getTronContract("ButterRouterV31", hre.artifacts, network.name, router_addr);
      await c.rescueFunds(tronAddressToHex(taskArgs.token), taskArgs.amount).send();
    } else {
      console.log("rescueFunds deployer:", deployer.address);
      let Router = await ethers.getContractFactory("ButterRouterV31");
      let router = Router.attach(router_addr);
      let result = await (await router.rescueFunds(taskArgs.token, taskArgs.amount)).wait();
      if (result.status === 1) {
        console.log(`ButterRouterV31 ${router.address} rescueFunds ${taskArgs.token} ${taskArgs.amount} succeed`);
      } else {
        console.log("rescueFunds failed");
      }
    }
    console.log("RouterV31 rescueFunds completed.");
  });

task("routerV31:rescueFunds", "Rescue funds from ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("token", "Token address")
    .addParam("amount", "Token amount")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }

        if (network.name === "Tron" || network.name === "TronTest") {
            console.log("deployer:", await getTronDeployer(false, network.name));
            let c = await getTronContract("ButterRouterV31", hre.artifacts, network.name, router_addr);
            await c.rescueFunds(tronAddressToHex(taskArgs.token), taskArgs.amount).send();
        } else {
            console.log("rescueFunds deployer:", deployer.address);
            let Router = await ethers.getContractFactory("ButterRouterV31");
            let router = Router.attach(router_addr);
            let result = await (await router.rescueFunds(taskArgs.token, taskArgs.amount)).wait();
            if (result.status === 1) {
                console.log(`ButterRouterV31 ${router.address} rescueFunds ${taskArgs.token} ${taskArgs.amount} succeed`);
            } else {
                console.log("rescueFunds failed");
            }
        }
        console.log("RouterV31 rescueFunds completed.");
    });

task("routerV31:update", "Check and update ButterRouterV31 from config file")
    .addOptionalParam("router", "Router address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer:", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }

        // Check current configuration against config file
        await checkAuthorization("ButterRouterV31", hre.artifacts, network.name, router_addr, config.v3.executors);
        await checkBridgeAndWToken("ButterRouterV31", hre.artifacts, network.name, router_addr, config);
        await checkFee("ButterRouterV31", hre.artifacts, network.name, router_addr, config);

        // Remove deprecated authorizations
        await hre.run("routerV31:removeAuthFromConfig", { router: router_addr });

        console.log("RouterV31 update completed.");
    });

task("routerV31:removeAuthFromConfig", "Remove authorization from config file")
    .addOptionalParam("router", "Router address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        console.log("deployer:", deployer.address);
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let config = getConfig(hre.network.name);
        if (!config) {
            throw "config not set";
        }

        if (!config.removes || config.removes.length === 0) {
            console.log("no removes list");
            return;
        }

        await removeAuthFromConfig("ButterRouterV31", hre.artifacts, network.name, router_addr, config.removes);
        console.log("RouterV31 remove authorization from config file completed.");
    });

task("routerV31:bridge", "Bridge tokens using ButterRouterV31")
    .addOptionalParam("router", "Router address", "", types.string)
    .addParam("token", "Token address")
    .addParam("amount", "Token amount")
    .addParam("chain", "Target chain ID")
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        let router_addr = await getRouterAddress(taskArgs.router, network.name);
        let config = getConfig(network.name);
        if (!config) {
            throw "config not set";
        }

        if (network.name === "Tron" || network.name === "TronTest") {
            // TODO: Implement Tron bridge logic
            console.log("Tron bridge not implemented yet");
        } else {
            let Router = await ethers.getContractFactory("ButterRouterV31");
            let router = Router.attach(router_addr);

            let token = await ethers.getContractAt("MockToken", taskArgs.token);
            let decimals = await token.decimals();
            let value = ethers.utils.parseUnits(taskArgs.amount, decimals);

            // Encode bridge parameters
            let bridge = ethers.utils.AbiCoder.prototype.encode(
                ["uint256", "uint256", "bytes", "bytes"],
                [taskArgs.chain, 0, deployer.address, []]
            );

            let bridgeData = ethers.utils.solidityPack(["uint256", "bytes"], [0x20, bridge]);

            // Check and approve token if needed
            let approved = await token.allowance(deployer.address, router.address);
            console.log("Current approval:", approved.toString());
            if (approved.lt(value)) {
                console.log(`${taskArgs.token} approve ${router.address} value [${value}] ...`);
                await (await token.approve(router.address, value)).wait();
            }

            // Execute bridge transaction
            let result = await (
                await router.swapAndBridge(
                    ethers.constants.HashZero,
                    deployer.address,
                    taskArgs.token,
                    value,
                    [],
                    bridgeData,
                    [],
                    []
                )
            ).wait();

            if (result.status === 1) {
                console.log(`ButterRouterV31 ${router.address} bridge ${taskArgs.token} ${taskArgs.amount} to chain ${taskArgs.chain} succeed`);
                console.log("Transaction hash:", result.transactionHash);
            } else {
                console.log("Bridge transaction failed");
            }
        }
        console.log("RouterV31 bridge completed.");
    });

task("routerV31:info", "Display ButterRouterV31 contract information")
    .addOptionalParam("router", "Router address", "", types.string)
    .setAction(async (taskArgs, hre) => {
        const { network, ethers } = hre;
        let router_addr = await getRouterAddress(taskArgs.router, network.name);

        if (network.name === "Tron" || network.name === "TronTest") {
            let c = await getTronContract("ButterRouterV31", hre.artifacts, network.name, router_addr);
            console.log("=== ButterRouterV31 Contract Information ===");
            console.log("Address:", router_addr);
            console.log("Bridge Address:", await c.bridgeAddress().call());
            console.log("Fee Manager:", await c.feeManager().call());
            console.log("Owner:", await c.owner().call());
        } else {
            let Router = await ethers.getContractFactory("ButterRouterV31");
            let router = Router.attach(router_addr);

            console.log("=== ButterRouterV31 Contract Information ===");
            console.log("Address:", router.address);
            console.log("Bridge Address:", await router.bridgeAddress());
            console.log("Fee Manager:", await router.feeManager());
            console.log("Owner:", await router.owner());
            console.log("Fee Receiver:", await router.feeReceiver());
            console.log("Router Fee Rate:", await router.routerFeeRate());
            console.log("Router Fixed Fee:", await router.routerFixedFee());
            console.log("Max Fee Rate:", await router.maxFeeRate());
            console.log("Max Native Fee:", await router.maxNativeFee());
        }
    });
