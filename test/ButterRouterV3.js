let { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
let { BigNumber } = require("ethers");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { SourceLocation } = require("hardhat/internal/hardhat-network/stack-traces/model");

let wToken = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

let ERC20 = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint value) external returns (bool)",
];

describe("ButterRouterV3", function () {
    let router;
    let brdige;
    let swapAdapter;

    async function deployFixture(_wToken) {
        let [wallet, other] = await ethers.getSigners();
        BridgeMock = await ethers.getContractFactory("BridgeMock");
        brdige = await BridgeMock.deploy();
        await brdige.deployed();
        let SwapAdapter = await ethers.getContractFactory("SwapAdapter");
        swapAdapter = await SwapAdapter.deploy(wallet.address);
        await swapAdapter.deployed();
        ButterRouterV3 = await ethers.getContractFactory("ButterRouterV3");
        if (!_wToken) {
            _wToken = brdige.address;
        }
        router = await ButterRouterV3.deploy(brdige.address, wallet.address, _wToken);
        await router.deployed();
        await (await router.setAuthorization([swapAdapter.address], true)).wait();
    }

    it("setBridgeAddress only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).setBridgeAddress(brdige.address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("setAuthorization only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).setAuthorization([brdige.address], true)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("rescueFunds correct", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        let tx = {
            to: router.address,
            value: ethers.utils.parseEther("1"),
        };

        await (await wallet.sendTransaction(tx)).wait();
        await expect(router.connect(other).rescueFunds(ethers.constants.AddressZero, ethers.utils.parseEther("1"))).to
            .be.ok;
    });

    it("rescueFunds only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(other).rescueFunds(ethers.constants.AddressZero, 100)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        );
    });

    it("setBridgeAddress _bridgeAddress must be contract", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setBridgeAddress(wallet.address)).to.be.reverted;
    });

    it("setBridgeAddress correct", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setBridgeAddress(brdige.address)).to.be.emit(router, "SetBridgeAddress");
        let m = await router.bridgeAddress();
        expect(m).eq(brdige.address);
    });

    it("setAuthorization only owner", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setAuthorization([wallet.address], true)).to.be.reverted;
    });

    it("setAuthorization correct", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        await expect(router.connect(wallet).setAuthorization([brdige.address], true)).to.be.emit(router, "Approve");
        let p = await router.approved(brdige.address);
        expect(p).to.be.true;
        await expect(router.connect(wallet).setAuthorization([brdige.address], false)).to.be.emit(router, "Approve");
        p = await router.approved(brdige.address);
        expect(p).to.be.false;
    });

    it("swapAndBridge -> butter Bridge v3", async () => {
        let [wallet, other] = await ethers.getSigners();
        let bridge_addr = "0xBB030b0aB399B77866c9DE1a513E4513164e0bf3";
        let user;
        this.timeout(0);
        await network.provider.request({
            method: "hardhat_reset",
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY,
                        blockNumber: 59134032,
                    },
                },
            ],
        });
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0x693fB96fdDa3c382fDe7F43a622209c3dD028B98"],
        });
        user = await ethers.getSigner("0x693fB96fdDa3c382fDe7F43a622209c3dD028B98");
        await deployFixture(wToken);
        await await router.setReferrerMaxFee(1000, ethers.utils.parseEther("1"));
        await (await router.setFee(other.address, 50, 200)).wait();
        await (await router.setBridgeAddress(bridge_addr)).wait();
        let weth_addr = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
        let usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
        let to = user.address;
        let gasLimit = "300000";
        let sushi_abi = [
            "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)",
            "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        ];
        let deadline = Math.floor(Date.now() / 1000) + 600;
        let sushi = await ethers.getContractAt(sushi_abi, "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", user); //sushi router
        let sushi_swap0 = sushi.interface.encodeFunctionData("swapExactTokensForETH", [
            ethers.utils.parseEther("0.0009"),
            0,
            [weth_addr, wToken],
            router.address,
            deadline,
        ]);
        let sushi_swap1 = sushi.interface.encodeFunctionData("swapExactTokensForTokens", [
            ethers.utils.parseEther("0.0018"),
            0,
            [weth_addr, usdt],
            router.address,
            deadline,
        ]);
        await (await router.setAuthorization([sushi.address], true)).wait();
        let amount = ethers.utils.parseEther("0.003");
        let token = await ethers.getContractAt(ERC20, weth_addr, user);
        await (await token.approve(router.address, amount)).wait();
        let remove_swapData = "0x";
        let mos_BridgeParam = {
            gasLimit: gasLimit,
            refundAddress: user.address,
            swapData: remove_swapData,
        };
        let abi = [
            "function getNativeFee(address _token, uint256 _gasLimit, uint256 _toChain) external view returns (uint256)",
        ];
        let MOS = await ethers.getContractAt(abi, bridge_addr, user);
        let value = await MOS.getNativeFee(usdt, gasLimit, 56);
        let b_data = ethers.utils.defaultAbiCoder.encode(
            ["tuple(uint256,bytes,bytes)"],
            [[mos_BridgeParam.gasLimit, mos_BridgeParam.refundAddress, mos_BridgeParam.swapData]]
        );
        let transferId = ethers.constants.HashZero;
        let initiator = user.address;
        let srcToken = weth_addr;
        let callData1 = ethers.utils.defaultAbiCoder.encode(["uint256[]", "bytes"], [[0], sushi_swap0]);
        let callData2 = ethers.utils.defaultAbiCoder.encode(["uint256[]", "bytes"], [[0], sushi_swap1]);
        let Swap0 = {
            dexType: 4,
            callTo: sushi.address,
            approveTo: sushi.address,
            fromAmount: ethers.utils.parseEther("0.0009"),
            callData: callData1,
        };
        let Swap1 = {
            dexType: 4,
            callTo: sushi.address,
            approveTo: sushi.address,
            fromAmount: ethers.utils.parseEther("0.0018"),
            callData: callData2,
        };

        let SwapParam = {
            dstToken: usdt,
            receiver: user.address,
            leftReceiver: user.address,
            minAmount: 0,
            swaps: [Swap0, Swap1],
        };
        let swapData = ethers.utils.defaultAbiCoder.encode(
            ["tuple(address,address,address,uint256,tuple(uint8,address,address,uint256,bytes)[])"],
            [
                [
                    SwapParam.dstToken,
                    SwapParam.receiver,
                    SwapParam.leftReceiver,
                    SwapParam.minAmount,
                    [
                        [Swap0.dexType, Swap0.callTo, Swap0.approveTo, Swap0.fromAmount, Swap0.callData],
                        [Swap1.dexType, Swap1.callTo, Swap1.approveTo, Swap1.fromAmount, Swap1.callData],
                    ],
                ],
            ]
        );
        let bridgeData = ethers.utils.defaultAbiCoder.encode(
            ["tuple(uint256,uint256,bytes,bytes)"],
            [[56, value, to, b_data]]
        );
        let permitData = "0x";
        let feeData = ethers.utils.defaultAbiCoder.encode(["tuple(uint8,address,uint256)"], [[1, wallet.address, 50]]);

        let r = await router.getFeeDetail(srcToken, amount, feeData);
        console.log(r);
        console.log(await token.balanceOf(wallet.address));
        console.log(await wallet.getBalance());
        console.log(await token.balanceOf(other.address));
        console.log(await other.getBalance());
        await expect(
            router
                .connect(user)
                .swapAndBridge(transferId, initiator, srcToken, amount, swapData, bridgeData, permitData, feeData, {
                    value: 200,
                })
        ).to.be.emit(router, "SwapAndBridge");
        // let result = await(await router.connect(user).swapAndBridge(transferId,initiator,srcToken,amount,swapData,bridgeData,permitData,feeData,{value:200})).wait()
        // console.log(result);
        console.log(await token.balanceOf(wallet.address));
        console.log(await wallet.getBalance());
        console.log(await token.balanceOf(other.address));
        console.log(await other.getBalance());
    });
});
