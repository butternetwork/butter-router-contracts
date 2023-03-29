
let { loadFixture } = require("@nomicfoundation/hardhat-network-helpers") ;
let { BigNumber } = require("ethers") ;
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
        MosMock = await ethers.getContractFactory("MosMock");
        mos = await MosMock.deploy();
        await mos.deployed();

        ButterRouterV2 = await ethers.getContractFactory("ButterRouterV2");
        router = await ButterRouterV2.deploy(mos.address);
        await(await router.setAuthorization(v5_router_addr,true)).wait()
        await router.deployed()
    }


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
        //tx https://etherscan.io/tx/0x2af1262e6bb3cb4d7dacba31308feaa494ec7baa8f9c5e5852ce8ef7ba13c5e3
        let data = "0x12aa3caf0000000000000000000000007122db0ebe4eb9b434a9f2ffe6760bc03bfbd0e00000000000000000000000006f3277ad0782a7da3eb676b85a8346a100bf9c1c000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec70000000000000000000000004c7e62fbb86b204f7c6dc1f582ddd889182d5cf50000000000000000000000001252eb0912559a206dd3600f283f2a48dca2419600000000000000000000000000000000000000000083225966d50d5bd8100000000000000000000000000000000000000000000000000000000000001559be1a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001100000000000000000000000000000000000000000000000000000000000f200a007e5c0d20000000000000000000000000000000000000000000000000000ce00006700206ae40711b8002dc6c04c7e62fbb86b204f7c6dc1f582ddd889182d5cf50d4a11d5eeaac28ec3f61d100daf4d40471f185200000000000000000000000000000000000000000000000000000000000000016f3277ad0782a7da3eb676b85a8346a100bf9c1c00206ae40711b8002dc6c00d4a11d5eeaac28ec3f61d100daf4d40471f18521111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000000000000000001c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000e26b9977"
        let _amount = BigNumber.from("158531492000000000000000000");
        let _srcToken = "0x6f3277ad0782a7DA3eb676b85a8346A100BF9C1c";
    //     //    struct SwapParam {
    //     address excutor;
    //     // address srcToken;
    //     address dstToken;
    //     // uint256 minReturnAmount;
    //     bytes data;
    // }
        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(address, address,bytes)'], [[v5_router_addr, "0xdAC17F958D2ee523a2206206994597C13D831ec7",data]]);
        let _bridgeData = "0x"
        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, "0x6f3277ad0782a7DA3eb676b85a8346A100BF9C1c", user); 
        let tokenOut = await ethers.getContractAt(ERC20, "0xdAC17F958D2ee523a2206206994597C13D831ec7", user); 
        let balanceBefore = await tokenOut.balanceOf(user.address);
        await(await token.approve(router.address,_amount)).wait();  
        await(await router.connect(user).swapAndBridge(_amount,_srcToken,_swapData,_bridgeData,_permitData)).wait();
        let balanceAfter = await tokenOut.balanceOf(user.address);
        
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
        //tx https://etherscan.io/tx/0xb6a7276b87b9763898c38ea19b7573cd81e6af5643031b835d15aa2ad6000442
        let data = "0xe449022e00000000000000000000000000000000000000000000002040afeac5ac1a3767000000000000000000000000000000000000000000000000250875e870d7b5850000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000080c7770b4399ae22149db17e97f9fc8a10ca5100e26b9977"
        let _amount = BigNumber.from("594957012632774260583");
        let _srcToken = "0xA8b919680258d369114910511cc87595aec0be6D";
    //     //    struct SwapParam {
    //     address excutor;
    //     // address srcToken;
    //     address dstToken;
    //     // uint256 minReturnAmount;
    //     bytes data;
    // }
        let _swapData =  ethers.utils.defaultAbiCoder.encode(['tuple(address, address,bytes)'], [[v5_router_addr, ethers.constants.AddressZero,data]]);
        let _bridgeData = "0x"
        let _permitData = "0x"
        let token = await ethers.getContractAt(ERC20, _srcToken, user); 
        let balanceBefore = await user.getBalance();
        await(await token.approve(router.address,_amount)).wait();  
        await(await router.connect(user).swapAndBridge(_amount,_srcToken,_swapData,_bridgeData,_permitData)).wait();
        let balanceAfter = await user.getBalance();
        
        expect(balanceAfter).gt(balanceBefore);
    })




})