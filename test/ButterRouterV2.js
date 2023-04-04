
let { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
let { BigNumber } = require("ethers");
const { expect } = require("chai");
const exp = require("constants");
const { sync } = require("glob");
const { ethers, network } = require("hardhat");
const { any } = require("hardhat/internal/core/params/argumentTypes");


let v5_router_addr = "0x1111111254EEB25477B68fb85Ed929f73A960582";

let ERC20 = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint value) external returns (bool)'
]
//// fork mainnet
describe("ButterRouterV2", function () {
    let router;
    let mos;
    // beforeEach(async () => {

    // });

    async function deployFixture() {
        let [wallet, other] = await ethers.getSigners();
        MosMock = await ethers.getContractFactory("MosMock");
        mos = await MosMock.deploy();
        await mos.deployed();

        ButterRouterV2 = await ethers.getContractFactory("ButterRouterV2");
        router = await ButterRouterV2.deploy(mos.address,wallet.address);
        await router.deployed()
    }

    it("setFee only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).setFee(wallet.address, 100,10000000)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("setMosAddress only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).setMosAddress(mos.address)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("setAuthorization only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).setAuthorization(mos.address, true)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("rescueFunds correct", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        let tx = {
            to: router.address,
            value: ethers.utils.parseEther('1')
        };

        await (await wallet.sendTransaction(tx)).wait();
        await expect(router.connect(other).rescueFunds(ethers.constants.AddressZero,ethers.utils.parseEther('1'))).to.be.ok;
    })

    it("rescueFunds only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).rescueFunds(ethers.constants.AddressZero,100)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("setFee feeReceiver zero address", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setFee(ethers.constants.AddressZero,1000,100)).to.be.revertedWith("zero address");
    })

    it("setFee feeRate less than 1000000", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setFee(wallet.address, 1000000,10000000)).to.be.reverted;
    })

    it("setFee correct ", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setFee(wallet.address,10000,10000000)).to.be.emit(router, "SetFee");
        let fee = await router.getFee(100000,ethers.constants.AddressZero,1);
        expect(fee._feeReceiver).eq(wallet.address);
        expect(fee._fee).eq(1000)
    })

    it("setMosAddress _mosAddress must be contract", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setMosAddress(wallet.address)).to.be.revertedWith("_mosAddress must be contract");
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
        await expect(router.connect(wallet).setAuthorization(wallet.address, true)).to.be.revertedWith("_excutor must be contract");
    })

    it("setAuthorization correct", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setAuthorization(mos.address, true)).to.be.emit(router,"Approve");
        let p = await router.approved(mos.address);
        expect(p).to.be.true;
        await expect(router.connect(wallet).setAuthorization(mos.address, false)).to.be.emit(router,"Approve");
        p = await router.approved(mos.address);
        expect(p).to.be.false;
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
        await deployFixture();
        await(await router.setAuthorization(v5_router_addr,true)).wait()
        //tx https://etherscan.io/tx/0x2af1262e6bb3cb4d7dacba31308feaa494ec7baa8f9c5e5852ce8ef7ba13c5e3
        let data = "0x12aa3caf0000000000000000000000007122db0ebe4eb9b434a9f2ffe6760bc03bfbd0e00000000000000000000000006f3277ad0782a7da3eb676b85a8346a100bf9c1c000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec70000000000000000000000004c7e62fbb86b204f7c6dc1f582ddd889182d5cf50000000000000000000000001252eb0912559a206dd3600f283f2a48dca2419600000000000000000000000000000000000000000083225966d50d5bd8100000000000000000000000000000000000000000000000000000000000001559be1a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001100000000000000000000000000000000000000000000000000000000000f200a007e5c0d20000000000000000000000000000000000000000000000000000ce00006700206ae40711b8002dc6c04c7e62fbb86b204f7c6dc1f582ddd889182d5cf50d4a11d5eeaac28ec3f61d100daf4d40471f185200000000000000000000000000000000000000000000000000000000000000016f3277ad0782a7da3eb676b85a8346a100bf9c1c00206ae40711b8002dc6c00d4a11d5eeaac28ec3f61d100daf4d40471f18521111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000000000000000001c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000e26b9977"
        let _amount = BigNumber.from("158531492000000000000000000");
        let _srcToken = "0x6f3277ad0782a7DA3eb676b85a8346A100BF9C1c";

        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(address,address,address,uint256,bytes)'], [[v5_router_addr,user.address,"0xdAC17F958D2ee523a2206206994597C13D831ec7",0,data]]);
        let _bridgeData = "0x"
        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, "0x6f3277ad0782a7DA3eb676b85a8346A100BF9C1c", user); 
        let tokenOut = await ethers.getContractAt(ERC20, "0xdAC17F958D2ee523a2206206994597C13D831ec7", user); 
        let balanceBefore = await tokenOut.balanceOf(user.address);
        await(await token.approve(router.address,_amount)).wait();  
        await(await router.connect(user).swapAndCall(_srcToken,_amount,1,_swapData,_bridgeData,_permitData)).wait();
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
        await deployFixture();
        await(await router.setAuthorization(v5_router_addr,true)).wait()
        //tx https://etherscan.io/tx/0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442
        let data = "0xe449022e00000000000000000000000000000000000000000000002040afeac5ac1a3767000000000000000000000000000000000000000000000000250875e870d7b5850000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000080c7770b4399ae22149db17e97f9fc8a10ca5100e26b9977"
        let _amount = BigNumber.from("594957012632774260583");
        let _srcToken = "0xA8b919680258d369114910511cc87595aec0be6D";

        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(address,address,address,uint256,bytes)'], [[v5_router_addr, user.address,ethers.constants.AddressZero,0,data]]);
        let _bridgeData = "0x"
        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        let balanceBefore = await user.getBalance();
        await(await token.approve(router.address,_amount)).wait();  
        await(await router.connect(user).swapAndCall(_srcToken,_amount,1,_swapData,_bridgeData,_permitData)).wait();
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
        await deployFixture();
        await(await router.setAuthorization(v5_router_addr,true)).wait()
        //tx https://etherscan.io/tx/0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442
        let data = "0xe449022e00000000000000000000000000000000000000000000002040afeac5ac1a3767000000000000000000000000000000000000000000000000250875e870d7b5850000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000080c7770b4399ae22149db17e97f9fc8a10ca5100e26b9977"
        let _amount = BigNumber.from("594957012632774260583");
        let _srcToken = "0xA8b919680258d369114910511cc87595aec0be6D";
           
        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(address,address,address,uint256,bytes)'], [[v5_router_addr,user.address,ethers.constants.AddressZero,0,data]]);
        
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
        await deployFixture();
        await(await router.setAuthorization(v5_router_addr,true)).wait()
        await(await router.setAuthorization(pay.address,true)).wait()
        //tx https://etherscan.io/tx/0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442
        let data = "0xe449022e00000000000000000000000000000000000000000000002040afeac5ac1a3767000000000000000000000000000000000000000000000000250875e870d7b5850000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000080c7770b4399ae22149db17e97f9fc8a10ca5100e26b9977"
        let _amount = BigNumber.from("594957012632774260583");
        let _srcToken = "0xA8b919680258d369114910511cc87595aec0be6D";
           
        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(address,address,address,uint256,bytes)'], [[v5_router_addr,user.address,ethers.constants.AddressZero,0,data]]);
        
        let pay_fuc_encode = PayMock.interface.encodeFunctionData("payFor",[user.address]);

        let _payData = ethers.utils.defaultAbiCoder.encode(['tuple(address,uint256,address,bytes)'],[[pay.address,ethers.utils.parseEther("1"),user.address,pay_fuc_encode]]);
        
        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        await(await token.approve(router.address,_amount)).wait();  
        await expect(router.connect(user).swapAndCall(_srcToken,_amount,1,_swapData,_payData,_permitData)).to.be.emit(pay,"Pay").emit(router,"SwapAndCall");
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
        await deployFixture();
        await(await router.setAuthorization(v5_router_addr,true)).wait()
        await(await router.setAuthorization(pay.address,true)).wait()
        //tx https://etherscan.io/tx/0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442
        let data = "0xe449022e00000000000000000000000000000000000000000000002040afeac5ac1a3767000000000000000000000000000000000000000000000000250875e870d7b5850000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000080c7770b4399ae22149db17e97f9fc8a10ca5100e26b9977"
        let _amount = BigNumber.from("594957012632774260583");
        let _srcToken = "0xA8b919680258d369114910511cc87595aec0be6D";
           
        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(address,address,address,uint256,bytes)'], [[v5_router_addr,user.address,ethers.constants.AddressZero,0,data]]);
        
        let pay_fuc_encode = PayMock.interface.encodeFunctionData("payFor",[user.address]);

        let _payData = ethers.utils.defaultAbiCoder.encode(['tuple(address,uint256,address,bytes)'],[[pay.address,ethers.utils.parseEther("1"),user.address,pay_fuc_encode]]);
        
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        await(await token.approve(mos.address,_amount)).wait();  
        await expect(mos.connect(user).mockRemoteSwapAndCall(router.address,_srcToken,_amount,_swapData,_payData)).to.be.emit(pay,"Pay").emit(router,"SwapAndCall");
        let result = await ethers.provider.getBalance(pay.address);
        expect(result).gt(0);
    })


})