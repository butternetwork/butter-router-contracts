let { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
let { BigNumber } = require("ethers");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

let v5_router_addr = "0x1111111254EEB25477B68fb85Ed929f73A960582";

let wToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

let ERC20 = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint value) external returns (bool)",
];

let ERC1155 = ["function balanceOf(address account, uint256 id) external view returns (uint256)"];
//// fork mainnet
describe("ButterRouterV3", function () {
    let router;
    let brdige;
    let swapAdapter;
    // beforeEach(async () => {

    // });

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
        await expect(router.connect(wallet).setBridgeAddress(wallet.address)).to.be.revertedWith(
            "ButterRouterV3: not contract"
        );
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
        await expect(router.connect(wallet).setAuthorization([wallet.address], true)).to.be.revertedWith(
            "ButterRouterV3: not contract"
        );
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
});
