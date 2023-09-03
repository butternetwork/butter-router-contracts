
let { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
let { BigNumber } = require("ethers");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");



let v5_router_addr = "0x1111111254EEB25477B68fb85Ed929f73A960582";

let wToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

let ERC20 = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint value) external returns (bool)'
]

let ERC1155 = [
    'function balanceOf(address account, uint256 id) external view returns (uint256)'
]
//// fork mainnet
describe("ButterRouterV2", function () {
    let router;
    let mos;
    let swapAdapter;
    // beforeEach(async () => {

    // });

    async function deployFixture(_wToken) {
        let [wallet, other] = await ethers.getSigners();
        MosMock = await ethers.getContractFactory("MosMock");
        mos = await MosMock.deploy();
        await mos.deployed();
        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");
        swapAdapter = await SwapAdapter.deploy(wallet.address);
        await swapAdapter.deployed();
        ButterRouterV2 = await ethers.getContractFactory("ButterRouterV2");
        if (!_wToken) {
            _wToken = mos.address
        }
        router = await ButterRouterV2.deploy(mos.address, wallet.address, _wToken);
        await router.deployed()
        await (await router.setAuthorization([swapAdapter.address],true)).wait();
    }

    it("setFee only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).setFee(wallet.address, 100, 10000000)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("setMosAddress only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).setMosAddress(mos.address)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("setAuthorization only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).setAuthorization([mos.address], true)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("rescueFunds correct", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        let tx = {
            to: router.address,
            value: ethers.utils.parseEther('1')
        };

        await (await wallet.sendTransaction(tx)).wait();
        await expect(router.connect(other).rescueFunds(ethers.constants.AddressZero, ethers.utils.parseEther('1'))).to.be.ok;
    })

    it("rescueFunds only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).rescueFunds(ethers.constants.AddressZero, 100)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("setFee feeReceiver zero address", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setFee(ethers.constants.AddressZero, 1000, 100)).to.be.revertedWith("ButterRouterV2: zero addr");
    })

    it("setFee feeRate less than 1000000", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setFee(wallet.address, 1000000, 10000000)).to.be.reverted;
    })

    it("setFee correct ", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setFee(wallet.address, 10000, 10000000)).to.be.emit(router, "SetFee");
        let fee = await router.getFee(100000, ethers.constants.AddressZero, 1);
        expect(fee._feeReceiver).eq(wallet.address);
        expect(fee._fee).eq(1000)
    })

    it("setMosAddress _mosAddress must be contract", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setMosAddress(wallet.address)).to.be.revertedWith("ButterRouterV2: not contract");
    })

    it("setMosAddress correct", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setMosAddress(mos.address)).to.be.emit(router, "SetMos");
        let m = await router.mosAddress();
        expect(m).eq(mos.address);
    })

    it("setAuthorization only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setAuthorization([wallet.address], true)).to.be.revertedWith("ButterRouterV2: not contract");
    })

    it("setAuthorization correct", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setAuthorization([mos.address], true)).to.be.emit(router, "Approve");
        let p = await router.approved(mos.address);
        expect(p).to.be.true;
        await expect(router.connect(wallet).setAuthorization([mos.address], false)).to.be.emit(router, "Approve");
        p = await router.approved(mos.address);
        expect(p).to.be.false;
    })
    // call rubic
    it("swapAndCall", async () => {
        let rubic = "0x3335733c454805df6a77f825f266e136FB4a3333"
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17278048,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x2152c4b93c86ead03ab44a63c4147ad1e6152604'],
        })
        user = await ethers.getSigner('0x2152c4b93c86ead03ab44a63c4147ad1e6152604')
        await deployFixture(wToken);
        await(await router.setAuthorization([rubic],true)).wait()
        //tx https://etherscan.io/tx/0x2af1262e6bb3cb4d7dacba31308feaa494ec7baa8f9c5e5852ce8ef7ba13c5e3
        let data = "0xe1fcde8e000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000502ae820000000000000000000000000000000000000000000000000000000000000364b3474174a75cec0a383680e9b6c8cd3d75f8b9615f7e41a836062df704f28d284ed4d925000000000000000000000000a96598475cb54c281e898d2d66fcfbe9c876950700000000000000000000000057819398ec5e589df7accb8a415ce718b6ab3b6e0000000000000000000000002152c4b93c86ead03ab44a63c4147ad1e6152604000000000000000000000000000000000000000000188082aa6e42ebe757afa900000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000006450dee7fd2fb8e39061434babcfc05599a6fb8000000000000000000000000000000000000000000000000000000000502ae8200000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001486af479b200000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000005016625000000000000000000000000000000000000000000188082aa6e42ebe757afa800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000646b175474e89094c44da98b954eedeac495271d0f00271006450dee7fd2fb8e39061434babcfc05599a6fb8000000000000000000000000000000000000000000000000000000000000869584cd000000000000000000000000a96598475cb54c281e898d2d66fcfbe9c8769507000000000000000000000000000000000000000000000026fd57ed7d6464899100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
        let _amount = BigNumber.from("84061826");
        let extraNativeAmount = ethers.utils.parseEther("0.00052109388027347")
        let _srcToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        let _swapData =  "0x";
        let _callData = ethers.utils.defaultAbiCoder.encode(['tuple(address,address,uint256,uint256,address,bytes)'],[[rubic,rubic,_amount,extraNativeAmount,user.address,data]]);
        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        let tokenOut = await ethers.getContractAt(ERC20, "0x06450dEe7FD2Fb8E39061434BAbCFC05599a6Fb8", user); 
        let balanceBefore = await tokenOut.balanceOf(user.address);
        await(await token.approve(router.address,_amount)).wait();  
        await(await router.connect(user).swapAndCall(ethers.constants.HashZero,_srcToken,_amount,0,_swapData,_callData,_permitData,{value:extraNativeAmount})).wait();
        let balanceAfter = await tokenOut.balanceOf(user.address);

        expect(balanceAfter).gt(balanceBefore);
    })

    it("swapAndCall", async () => {
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 16930372,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x1252eb0912559a206dd3600f283f2a48dca24196'],
        })
        user = await ethers.getSigner('0x1252eb0912559a206dd3600f283f2a48dca24196')
        await deployFixture(wToken);
        await(await router.setAuthorization([v5_router_addr],true)).wait()
        //tx https://etherscan.io/tx/0x2af1262e6bb3cb4d7dacba31308feaa494ec7baa8f9c5e5852ce8ef7ba13c5e3
        let data = "0x12aa3caf0000000000000000000000007122db0ebe4eb9b434a9f2ffe6760bc03bfbd0e00000000000000000000000006f3277ad0782a7da3eb676b85a8346a100bf9c1c000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec70000000000000000000000004c7e62fbb86b204f7c6dc1f582ddd889182d5cf50000000000000000000000001252eb0912559a206dd3600f283f2a48dca2419600000000000000000000000000000000000000000083225966d50d5bd8100000000000000000000000000000000000000000000000000000000000001559be1a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001100000000000000000000000000000000000000000000000000000000000f200a007e5c0d20000000000000000000000000000000000000000000000000000ce00006700206ae40711b8002dc6c04c7e62fbb86b204f7c6dc1f582ddd889182d5cf50d4a11d5eeaac28ec3f61d100daf4d40471f185200000000000000000000000000000000000000000000000000000000000000016f3277ad0782a7da3eb676b85a8346a100bf9c1c00206ae40711b8002dc6c00d4a11d5eeaac28ec3f61d100daf4d40471f18521111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000000000000000001c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000e26b9977"
        let _amount = BigNumber.from("158531492000000000000000000");
        let _srcToken = "0x6f3277ad0782a7DA3eb676b85a8346A100BF9C1c";
        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0,v5_router_addr,v5_router_addr,user.address,"0xdAC17F958D2ee523a2206206994597C13D831ec7",0,data]]);
        let _bridgeData = "0x"
        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, "0x6f3277ad0782a7DA3eb676b85a8346A100BF9C1c", user); 
        let tokenOut = await ethers.getContractAt(ERC20, "0xdAC17F958D2ee523a2206206994597C13D831ec7", user); 
        let balanceBefore = await tokenOut.balanceOf(user.address);
        await(await token.approve(router.address,_amount)).wait();  
        await(await router.connect(user).swapAndCall(ethers.constants.HashZero,_srcToken,_amount,1,_swapData,_bridgeData,_permitData)).wait();
        let balanceAfter = await tokenOut.balanceOf(user.address);

        expect(balanceAfter).gt(balanceBefore);
    })

    it("swapAndCall", async () => {
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 16930863,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x90c1d107ad3f503cd6ba3d1756da9935530816bf'],
        })
        user = await ethers.getSigner('0x90c1d107ad3f503cd6ba3d1756da9935530816bf')
        await deployFixture(wToken);
        await(await router.setAuthorization([v5_router_addr],true)).wait()
        //tx https://etherscan.io/tx/0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442
        let data = "0xe449022e00000000000000000000000000000000000000000000002040afeac5ac1a3767000000000000000000000000000000000000000000000000250875e870d7b5850000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000080c7770b4399ae22149db17e97f9fc8a10ca5100e26b9977"
        let _amount = BigNumber.from("594957012632774260583");
        let _srcToken = "0xA8b919680258d369114910511cc87595aec0be6D";

        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0,v5_router_addr,v5_router_addr,user.address,ethers.constants.AddressZero,0,data]]);
        let _bridgeData = "0x"
        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        let balanceBefore = await user.getBalance();
        await(await token.approve(router.address,_amount)).wait();  
        await(await router.connect(user).swapAndCall(ethers.constants.HashZero,_srcToken,_amount,1,_swapData,_bridgeData,_permitData)).wait();
        let balanceAfter = await user.getBalance();

        expect(balanceAfter).gt(balanceBefore);
    })

    it("swapAndBridge", async () => {
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 16930863,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x90c1d107ad3f503cd6ba3d1756da9935530816bf'],
        })
        user = await ethers.getSigner('0x90c1d107ad3f503cd6ba3d1756da9935530816bf')
        await deployFixture(wToken);
        await(await router.setAuthorization([v5_router_addr],true)).wait()
        //tx https://etherscan.io/tx/0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442
        let data = "0xe449022e00000000000000000000000000000000000000000000002040afeac5ac1a3767000000000000000000000000000000000000000000000000250875e870d7b5850000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000080c7770b4399ae22149db17e97f9fc8a10ca5100e26b9977"
        let _amount = BigNumber.from("594957012632774260583");
        let _srcToken = "0xA8b919680258d369114910511cc87595aec0be6D";

        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0,v5_router_addr,v5_router_addr,user.address,ethers.constants.AddressZero,0,data]]);

        let remote =  ethers.utils.defaultAbiCoder.encode(['tuple(uint256,uint256,bytes,uint64)[]','bytes','address'],[[],"0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442",ethers.constants.AddressZero])


        let _bridgeData = ethers.utils.defaultAbiCoder.encode(['tuple(uint256,bytes,bytes)'],[[56,user.address,remote]]);
        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        await(await token.approve(router.address,_amount)).wait();  
       // await(await router.connect(user).swapAndBridge(_amount,_srcToken,_swapData,_bridgeData,_permitData)).wait();
        await expect(router.connect(user).swapAndBridge(_srcToken,_amount,_swapData,_bridgeData,_permitData)).to.be.emit(mos,"SwapOut").emit(router,"SwapAndBridge");
        let result = await ethers.provider.getBalance(mos.address);
        expect(result).gt(0);
    })

    it("swapAndCall", async () => {
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 16930863,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x90c1d107ad3f503cd6ba3d1756da9935530816bf'],
        })
        user = await ethers.getSigner('0x90c1d107ad3f503cd6ba3d1756da9935530816bf')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        await(await router.setAuthorization([v5_router_addr],true)).wait()
        await(await router.setAuthorization([pay.address],true)).wait()
        //tx https://etherscan.io/tx/0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442
        let data = "0xe449022e00000000000000000000000000000000000000000000002040afeac5ac1a3767000000000000000000000000000000000000000000000000250875e870d7b5850000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000080c7770b4399ae22149db17e97f9fc8a10ca5100e26b9977"
        let _amount = BigNumber.from("594957012632774260583");
        let _srcToken = "0xA8b919680258d369114910511cc87595aec0be6D";

        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0,v5_router_addr,v5_router_addr,user.address,ethers.constants.AddressZero,0,data]]);

        let pay_fuc_encode = PayMock.interface.encodeFunctionData("payFor",[user.address]);

        let _payData = ethers.utils.defaultAbiCoder.encode(['tuple(address,address,uint256,uint256,address,bytes)'],[[pay.address,pay.address,ethers.utils.parseEther("1"),0,user.address,pay_fuc_encode]]);

        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        await(await token.approve(router.address,_amount)).wait();  
        await expect(router.connect(user).swapAndCall(ethers.constants.HashZero,_srcToken,_amount,1,_swapData,_payData,_permitData)).to.be.emit(pay,"Pay").emit(router,"SwapAndCall");
        let result = await ethers.provider.getBalance(pay.address);
        expect(result).gt(0);
    })



    it("remoteSwapAndCall", async () => {
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 16930863,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x90c1d107ad3f503cd6ba3d1756da9935530816bf'],
        })
        user = await ethers.getSigner('0x90c1d107ad3f503cd6ba3d1756da9935530816bf')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        await(await router.setAuthorization([v5_router_addr],true)).wait()
        await(await router.setAuthorization([pay.address],true)).wait()
        //tx https://etherscan.io/tx/0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442
        let data = "0xe449022e00000000000000000000000000000000000000000000002040afeac5ac1a3767000000000000000000000000000000000000000000000000250875e870d7b5850000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000080c7770b4399ae22149db17e97f9fc8a10ca5100e26b9977"
        let _amount = BigNumber.from("594957012632774260583");
        let _srcToken = "0xA8b919680258d369114910511cc87595aec0be6D";

        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0,v5_router_addr,v5_router_addr,user.address,ethers.constants.AddressZero,0,data]]);

        let pay_fuc_encode = PayMock.interface.encodeFunctionData("payFor",[user.address]);

        let _payData = ethers.utils.defaultAbiCoder.encode(['tuple(address,address,uint256,uint256,address,bytes)'],[[pay.address,pay.address,ethers.utils.parseEther("1"),0,user.address,pay_fuc_encode]]);

        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes','bytes'],[_swapData,_payData]);
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        await(await token.approve(mos.address,_amount)).wait();  
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address,_srcToken,_amount,swapAndCall)).to.be.emit(pay,"Pay").emit(router,"RemoteSwapAndCall");
        let result = await ethers.provider.getBalance(pay.address);
        expect(result).gt(0);
    })
    // tx https://etherscan.io/tx/0xd38df10cad9f11da100fa204961668f0baa7e4ab11344a17f168fc54f0cfe0d7
    it("remoteSwapAndCall _makeUniV3Swap -> native in ", async () => {

        let uniV3router = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
        let _srcToken = ethers.constants.AddressZero;
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17112227,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0xa20fd17ff992b626a5bbd9feccaec1816125180b'],
        })
        user = await ethers.getSigner('0xa20fd17ff992b626a5bbd9feccaec1816125180b')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        // await(await router.setAuthorization([uniV3router],true)).wait()
        await(await router.setAuthorization([pay.address],true)).wait()

        let path = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480027106982508145454ce325ddbe47a25d4ec3d2311933"

        let amount = "500000000000000000";

        let amountOutMin = "2028450095375484091949056250";

        let dstToken = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";

        let swap = ethers.utils.defaultAbiCoder.encode(["uint256","bytes"],[amountOutMin,path]); 
        let SwapData = {
            dexType:2,
            callTo:uniV3router,
            approveTo:uniV3router,
            fromAmount:amount + 1000,
            callData:swap
        }
        let swaps = [SwapData];

        let param = {
            srcToken:_srcToken,
            dstToken:dstToken,
            receiver:router.address,
            leftReceiver:user.address,
            minAmount:0,
            swaps:swaps
        }

        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");

        let data = SwapAdapter.interface.encodeFunctionData("swap",[param])

        swap =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0, swapAdapter.address, swapAdapter.address,user.address,dstToken,0,data]]);
        
        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes','bytes'],[swap,"0x"]);
        let token = await ethers.getContractAt(ERC20, dstToken, user); 
        let balanceBefore = await token.balanceOf(user.address);
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address,_srcToken,amount,swapAndCall,{value:amount})).to.be.emit(router,"RemoteSwapAndCall");
        let balanceAfter = await  await token.balanceOf(user.address);
        expect(balanceAfter).gt(balanceBefore);

    })


    it("remoteSwapAndCall _makeUniV3Swap -> native", async () => {

        let uniV3router = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
        let _srcToken = "0xdac17f958d2ee523a2206206994597c13d831ec7"
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17085007,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x963fad954f7ca6d140f476e9052f244541e09ad8'],
        })
        user = await ethers.getSigner('0x963fad954f7ca6d140f476e9052f244541e09ad8')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        await(await router.setAuthorization([uniV3router],true)).wait()
        await(await router.setAuthorization([pay.address],true)).wait()

        let path = "0xdac17f958d2ee523a2206206994597c13d831ec70001f4c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"

        let amount = "3550038197";

        let amountOutMin = ethers.utils.parseEther("1.5");

        let dstToken = ethers.constants.AddressZero;

        let swap = ethers.utils.defaultAbiCoder.encode(["uint256","bytes"],[amountOutMin,path]); 
        let SwapData = {
            dexType:2,
            callTo:uniV3router,
            approveTo:uniV3router,
            fromAmount:amount,
            callData:swap
        }
        let swaps = [SwapData];

        let param = {
            srcToken:_srcToken,
            dstToken:dstToken,
            receiver:router.address,
            leftReceiver:user.address,
            minAmount:0,
            swaps:swaps
        }
        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");

        let data = SwapAdapter.interface.encodeFunctionData("swap",[param])

        swap =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0, swapAdapter.address, swapAdapter.address,user.address,dstToken,0,data]]);
        

        let pay_fuc_encode = PayMock.interface.encodeFunctionData("payFor",[user.address]);

        let _payData = ethers.utils.defaultAbiCoder.encode(['tuple(address,address,uint256,uint256,address,bytes)'],[[pay.address,pay.address,ethers.utils.parseEther("1"),0,user.address,pay_fuc_encode]]);

        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes','bytes'],[swap,_payData]);
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        await(await token.approve(mos.address,amount)).wait();  
        let balanceBefore = await ethers.provider.getBalance(user.address);
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address,_srcToken,amount,swapAndCall)).to.be.emit(pay,"Pay").emit(router,"RemoteSwapAndCall");
        let balanceAfter = await ethers.provider.getBalance(user.address);
        expect(balanceAfter).gt(balanceBefore);
        let result = await ethers.provider.getBalance(pay.address);
        expect(result).gt(0);
    })

    it("remoteSwapAndCall _makeUniV3Swap -> tokens", async () => {

        let uniV3router = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
        let _srcToken = "0xdac17f958d2ee523a2206206994597c13d831ec7"
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17085007,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x963fad954f7ca6d140f476e9052f244541e09ad8'],
        })
        user = await ethers.getSigner('0x963fad954f7ca6d140f476e9052f244541e09ad8')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        await(await router.setAuthorization([uniV3router],true)).wait()
        await(await router.setAuthorization([pay.address],true)).wait()

        let path = "0xdac17f958d2ee523a2206206994597c13d831ec70001f4c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"

        let amount = "3550038197";

        let amountOutMin = ethers.utils.parseEther("1.5");

        let dstToken = wToken;

        let swap = ethers.utils.defaultAbiCoder.encode(["uint256","bytes"],[amountOutMin,path]); 
        let SwapData = {
            dexType:2,
            callTo:uniV3router,
            approveTo:uniV3router,
            fromAmount:amount,
            callData:swap
        }
        let swaps = [SwapData];

        let param = {
            srcToken:_srcToken,
            dstToken:dstToken,
            receiver:router.address,
            leftReceiver:user.address,
            minAmount:0,
            swaps:swaps
        }
        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");

        let data = SwapAdapter.interface.encodeFunctionData("swap",[param])

        swap =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0, swapAdapter.address, swapAdapter.address,user.address,dstToken,0,data]]);
        
        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes','bytes'],[swap,"0x"]);
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        let dstTokenContract = await ethers.getContractAt(ERC20, dstToken, user); 
        await(await token.approve(mos.address,amount)).wait();  
        let balanceBefore = await dstTokenContract.balanceOf(user.address);
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address,_srcToken,amount,swapAndCall)).to.be.emit(router,"RemoteSwapAndCall");
        let balanceAfter = await dstTokenContract.balanceOf(user.address);
        expect(balanceAfter).gt(balanceBefore);
    })

    it("remoteSwapAndCall _makeUniV2Swap -> swapExactTokensForETH", async () => {

        let uniV2router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        let _srcToken = "0x1A963Df363D01EEBB2816b366d61C917F20e1EbE"
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17085533,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x2ad88998e0becaf557f8df2fd71fc3ff9a9e6eb0'],
        })
        user = await ethers.getSigner('0x2ad88998e0becaf557f8df2fd71fc3ff9a9e6eb0')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        await(await router.setAuthorization([uniV2router],true)).wait()
        await(await router.setAuthorization([pay.address],true)).wait()

        let path = ["0x1A963Df363D01EEBB2816b366d61C917F20e1EbE","0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"]

        let amount = "20544470704991381589196369";

        let amountOutMin = "432915815816296645";

        let dstToken = ethers.constants.AddressZero;

        let swap = ethers.utils.defaultAbiCoder.encode(["uint256","address[]"],[amountOutMin,path]); 
        let SwapData = {
            dexType:1,
            callTo:uniV2router,
            approveTo:uniV2router,
            fromAmount:amount,
            callData:swap
        }
        let swaps = [SwapData];

        let param = {
            srcToken:_srcToken,
            dstToken:dstToken,
            receiver:router.address,
            leftReceiver:user.address,
            minAmount:0,
            swaps:swaps
        }
        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");

        let data = SwapAdapter.interface.encodeFunctionData("swap",[param])

        swap =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0, swapAdapter.address, swapAdapter.address,user.address,dstToken,0,data]]);
        
        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes','bytes'],[swap,"0x"]);
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        await(await token.approve(mos.address,amount)).wait();  
        let balanceBefore = await ethers.provider.getBalance(user.address);
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address,_srcToken,amount,swapAndCall)).to.be.emit(router,"RemoteSwapAndCall");
        let balanceAfter = await ethers.provider.getBalance(user.address);
        expect(balanceAfter).gt(balanceBefore);
    })

    it("remoteSwapAndCall _makeUniV2Swap -> swapExactTokensForTokens", async () => {

        let uniV2router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        let _srcToken = "0x1A963Df363D01EEBB2816b366d61C917F20e1EbE"
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17085533,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x2ad88998e0becaf557f8df2fd71fc3ff9a9e6eb0'],
        })
        user = await ethers.getSigner('0x2ad88998e0becaf557f8df2fd71fc3ff9a9e6eb0')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        await(await router.setAuthorization([uniV2router],true)).wait()
        await(await router.setAuthorization([pay.address],true)).wait()

        let path = ["0x1A963Df363D01EEBB2816b366d61C917F20e1EbE","0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"]

        let amount = "20544470704991381589196369";

        let amountOutMin = "432915815816296645";

        let dstToken = wToken;

        let swap = ethers.utils.defaultAbiCoder.encode(["uint256","address[]"],[amountOutMin,path]); 
        let SwapData = {
            dexType:1,
            callTo:uniV2router,
            approveTo:uniV2router,
            fromAmount:amount,
            callData:swap
        }
        let swaps = [SwapData];

        let param = {
            srcToken:_srcToken,
            dstToken:dstToken,
            receiver:router.address,
            leftReceiver:user.address,
            minAmount:0,
            swaps:swaps
        }
        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");

        let data = SwapAdapter.interface.encodeFunctionData("swap",[param])

        swap =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0, swapAdapter.address, swapAdapter.address,user.address,dstToken,0,data]]);
        
        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes','bytes',],[swap,"0x"]);
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        let dstTokenContract = await ethers.getContractAt(ERC20, dstToken, user); 
        await(await token.approve(mos.address,amount)).wait();  
        let balanceBefore = await dstTokenContract.balanceOf(user.address);
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address,_srcToken,amount,swapAndCall)).to.be.emit(router,"RemoteSwapAndCall");
        let balanceAfter = await dstTokenContract.balanceOf(user.address);
        expect(balanceAfter).gt(balanceBefore);
    })

    it("remoteSwapAndCall _makeAggFill -> ", async () => {

        let uniV2router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        let _srcToken = "0x1A963Df363D01EEBB2816b366d61C917F20e1EbE"
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17085533,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x2ad88998e0becaf557f8df2fd71fc3ff9a9e6eb0'],
        })
        user = await ethers.getSigner('0x2ad88998e0becaf557f8df2fd71fc3ff9a9e6eb0')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        await(await router.setAuthorization([uniV2router],true)).wait()
        await(await router.setAuthorization([pay.address],true)).wait()

        let path = ["0x1A963Df363D01EEBB2816b366d61C917F20e1EbE","0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"]

        let amount = "20544470704991381589196369";

        let amountOutMin = "432915815816296645";

        let dstToken = wToken;
        
        let interface = new ethers.utils.Interface([
        "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external"
        ])
        let swap = interface.encodeFunctionData("swapExactTokensForTokens",[0,amountOutMin,path,swapAdapter.address,"2324876578"]);
        swap = ethers.utils.defaultAbiCoder.encode(['uint256','bytes'],[36,swap]);
        // let swap = ethers.utils.defaultAbiCoder.encode(["uint256","address[]"],[amountOutMin,path]); 
        let SwapData = {
            dexType:4,
            callTo:uniV2router,
            approveTo:uniV2router,
            fromAmount:amount,
            callData:swap
        }
        let swaps = [SwapData];

        let param = {
            srcToken:_srcToken,
            dstToken:dstToken,
            receiver:router.address,
            leftReceiver:user.address,
            minAmount:0,
            swaps:swaps
        }
        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");

        let data = SwapAdapter.interface.encodeFunctionData("swap",[param])

        swap =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0, swapAdapter.address, swapAdapter.address,user.address,dstToken,0,data]]);
        
        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes','bytes',],[swap,"0x"]);
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        let dstTokenContract = await ethers.getContractAt(ERC20, dstToken, user); 
        await(await token.approve(mos.address,amount)).wait();  
        let balanceBefore = await dstTokenContract.balanceOf(user.address);
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address,_srcToken,amount,swapAndCall)).to.be.emit(router,"RemoteSwapAndCall");
        let balanceAfter = await dstTokenContract.balanceOf(user.address);
        expect(balanceAfter).gt(balanceBefore);
    })
    //  //tx https://etherscan.io/tx/0x78083d1e4b6d074e2a21814eb9eb39462b231d881fa2a3147bf5a7bb3215dfc8
    it("remoteSwapAndCall _makeUniV2Swap -> swapExactETHForTokens", async () => {

        let uniV2router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        let _srcToken = ethers.constants.AddressZero
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17113590,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x40a4815e5c27c4cbadda1488a174bba962cb7157'],
        })
        user = await ethers.getSigner('0x40a4815e5c27c4cbadda1488a174bba962cb7157')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        await(await router.setAuthorization([uniV2router],true)).wait()
        await(await router.setAuthorization([pay.address],true)).wait()

        let path = ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","0x1766884Fa00A9CbE62436eFB305b8e610Fc62d77"]

        let amount = ethers.utils.parseEther("0.029");

        let amountOutMin = "17359137506056714";

        let dstToken = "0x1766884Fa00A9CbE62436eFB305b8e610Fc62d77";

        let swap = ethers.utils.defaultAbiCoder.encode(["uint256","address[]"],[amountOutMin,path]); 
        let SwapData = {
            dexType:1,
            callTo:uniV2router,
            approveTo:uniV2router,
            fromAmount:amount,
            callData:swap
        }
        let swaps = [SwapData];

        let param = {
            srcToken:_srcToken,
            dstToken:dstToken,
            receiver:router.address,
            leftReceiver:user.address,
            minAmount:0,
            swaps:swaps
        }
        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");

        let data = SwapAdapter.interface.encodeFunctionData("swap",[param])

        swap =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0, swapAdapter.address, swapAdapter.address,user.address,dstToken,0,data]]);

        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes','bytes',],[swap,"0x"]);
        let token = await ethers.getContractAt(ERC20, dstToken, user); 
        let balanceBefore = await token.balanceOf(user.address);
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address,_srcToken,amount,swapAndCall,{value:amount})).to.be.emit(router,"RemoteSwapAndCall");
        let balanceAfter = await token.balanceOf(user.address);
        expect(balanceAfter).gt(balanceBefore);
    })

    it("remoteSwapAndCall _makeCurveSwap", async () => {

        let curverouter = "0x99a58482BD75cbab83b27EC03CA68fF489b5788f"
        let _srcToken = "0xD533a949740bb3306d119CC777fa900bA034cd52"
        let user;
        // 0x1252eb0912559a206dd3600f283f2a48dca24196
        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17085509,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0x7847d3a369b43a8cdc04e97356686bde309270a6'],
        })
        user = await ethers.getSigner('0x7847d3a369b43a8cdc04e97356686bde309270a6')
        PayMock = await ethers.getContractFactory("PayMock");
        let pay = await PayMock.deploy();
        await pay.deployed();
        await deployFixture(wToken);
        await (await router.setAuthorization([curverouter], true)).wait()
        await (await router.setAuthorization([pay.address], true)).wait()

        let _route = ["0xD533a949740bb3306d119CC777fa900bA034cd52", "0x8301AE4fc9c624d1D396cbDAa1ed877821D7C511", "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"]

        let amount = "2772790161868667456135";

        let amountOutMin = "1366530756526488982";

        let _swap_params = [[1, 0, 3], [0, 0, 0], [0, 0, 0], [0, 0, 0]]

        let pools = ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000"]

        let dstToken = ethers.constants.AddressZero;

        let swap =   ethers.utils.defaultAbiCoder.encode(['uint256', 'address[9]', 'uint256[3][4]', 'address[4]'], [amountOutMin,_route,_swap_params,pools]);;
        let SwapData = {
            dexType:3,
            callTo:curverouter,
            approveTo:curverouter,
            fromAmount:amount,
            callData:swap
        }
        let swaps = [SwapData];

        let param = {
            srcToken:_srcToken,
            dstToken:dstToken,
            receiver:router.address,
            leftReceiver:user.address,
            minAmount:0,
            swaps:swaps
        }
        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");

        let data = SwapAdapter.interface.encodeFunctionData("swap",[param])

        swap =  ethers.utils.defaultAbiCoder.encode(['tuple(uint8,address,address,address,address,uint256,bytes)'], [[0, swapAdapter.address, swapAdapter.address,user.address,dstToken,0,data]]);

        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes', 'bytes'], [swap, "0x"]);
        let token = await ethers.getContractAt(ERC20, _srcToken, user);
        await (await token.approve(mos.address, amount)).wait();
        let balanceBefore = await ethers.provider.getBalance(user.address);
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address, _srcToken, amount, swapAndCall)).to.be.emit(router, "RemoteSwapAndCall");
        let balanceAfter = await ethers.provider.getBalance(user.address);
        expect(balanceAfter).gt(balanceBefore);
    })
    // tx https://etherscan.io/tx/0x8dedd4e76b6f68cfaffcb15c50bdd3456f0582373fb5335fa437524f24b6d8af
    it("remoteSwapAndCall buy nft seaport", async () => {

        let seaport = "0x00000000000001ad428e4906ae43d8f9852d0dd6"
        let _srcToken = ethers.constants.AddressZero;
        let receiver = "0xf0Fb76CcAec8DEB6e91C06Cb28b009b25C6cD2eF"
        let user;

        this.timeout(0)
        await network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 17091882,
                    },
                },
            ],
        })
        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: ['0xeB2629a2734e272Bcc07BDA959863f316F4bD4Cf'],
        })
        user = await ethers.getSigner('0xeB2629a2734e272Bcc07BDA959863f316F4bD4Cf')

        await deployFixture(wToken);
        await (await router.setAuthorization([seaport], true)).wait()
        let amount = ethers.utils.parseEther("0.032");
        let swap = "0x"

        let call = "0xe7acab24000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000006200000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000000000000000000000000000f0fb76ccaec8deb6e91c06cb28b009b25c6cd2ef00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000520000000000000000000000000000000000000000000000000000000000000058000000000000000000000000015adca07e5cf9acc1ebb9dc003ff4c5f407d1316000000000000000000000000004c00500000ad104d7dbd00e3ae0a5c00560c0000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000643eaec30000000000000000000000000000000000000000000000000000000064663bc30000000000000000000000000000000000000000000000000000000000000000360c6ebe0000000000000000000000000000000000000000ca4db0b26a181ce50000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000005ea64e0723eb5f44aeb1995d2029702b8855463e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000065bfeda25e00000000000000000000000000000000000000000000000000000065bfeda25e000000000000000000000000000015adca07e5cf9acc1ebb9dc003ff4c5f407d13160000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002d79883d200000000000000000000000000000000000000000000000000000002d79883d200000000000000000000000000000000a26b00c1f0df003000390027140000faa7190000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009184e72a000000000000000000000000000000000000000000000000000000009184e72a00000000000000000000000000000e16b650921475afa532f7c08a8ea1c2fcda8ab930000000000000000000000000000000000000000000000000000000000000040a9aa969cd3073d8ca6d6d9c1423df9cc11d81bb02be667a8aabb3958b63f9ea0400055ac2a6e007f609648be936b23e7b0b2535cb6460eda8f66ea0ef2ed660a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000360c6ebe"
        let _payData = ethers.utils.defaultAbiCoder.encode(['tuple(address,address,uint256,uint256,address,bytes)'],[[seaport,seaport,amount,0,user.address,call]]);
        let swapAndCall = ethers.utils.defaultAbiCoder.encode(['bytes', 'bytes', 'bool'], [swap, _payData, false]);
        let token = await ethers.getContractAt(ERC1155, "0x5Ea64E0723eB5f44aEb1995D2029702B8855463e", user);
        let balanceBefore = await token.balanceOf(receiver,0);
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address, _srcToken, amount, swapAndCall,{value:amount})).to.be.emit(router, "RemoteSwapAndCall");
        let balanceAfter = await  token.balanceOf(receiver,0);
        expect(balanceAfter).gt(balanceBefore);
    })

})