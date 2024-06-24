const { expect } = require("chai");
const { ethers, network } = require("hardhat");

let ERC20 = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint value) external returns (bool)",
];

describe("FeeManager", function () {
    let feeManager;
    let token;

    async function deployFixture(_wToken) {
        let [wallet, other] = await ethers.getSigners();
        let FeeManager = await ethers.getContractFactory("FeeManager");
        feeManager = await FeeManager.deploy(wallet.address);
        await feeManager.deployed();
        let MockToken = await ethers.getContractFactory("MockToken");
        token = await MockToken.deploy("TEST", "TT");
        await token.deployed();
    }

    it("deployments", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();
        expect(await feeManager.owner()).eq(wallet.address);
    });

    it("setRouterFee", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();

        await expect(
            feeManager.connect(other).setRouterFee(other.address, "100000000000", 10, "6000", "6000")
        ).to.be.revertedWith("Ownable: caller is not the owner");
        await expect(
            feeManager.connect(wallet).setRouterFee(ethers.constants.AddressZero, "100000000000", 10, "6000", "6000")
        ).to.be.revertedWith("Router: zero addr");

        await expect(
            feeManager.connect(wallet).setRouterFee(other.address, "100000000000", 10001, "6000", "6000")
        ).to.be.revertedWith("FeeManager: invalid tokenFeeRate");

        await expect(
            feeManager.connect(wallet).setRouterFee(other.address, "100000000000", 100, "10001", "6000")
        ).to.be.revertedWith("FeeManager: invalid  routerShare");

        await expect(
            feeManager.connect(wallet).setRouterFee(other.address, "100000000000", 100, "6000", "6000")
        ).to.emit(feeManager, "SetIntegratorFeeRate");
        let f = await feeManager.feeInfoList(ethers.constants.AddressZero);
        expect(f.receiver).eq(other.address);
        expect(f.fixedNative).eq("100000000000");
        expect(f.tokenFeeRate).eq(100);
        expect(f.routerShare).eq(6000);
        expect(f.routerNativeShare).eq(6000);
    });

    it("setIntegratorFee", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();

        await expect(
            feeManager.connect(other).setIntegratorFee(other.address, other.address, "100000000000", 10, "6000", "6000")
        ).to.be.revertedWith("Ownable: caller is not the owner");
        await expect(
            feeManager
                .connect(wallet)
                .setIntegratorFee(ethers.constants.AddressZero, other.address, "100000000000", 10, "6000", "6000")
        ).to.be.revertedWith("Router: zero addr");

        await expect(
            feeManager
                .connect(wallet)
                .setIntegratorFee(other.address, ethers.constants.AddressZero, "100000000000", 10, "6000", "6000")
        ).to.be.revertedWith("Router: zero addr");

        await expect(
            feeManager
                .connect(wallet)
                .setIntegratorFee(other.address, other.address, "100000000000", 10001, "6000", "6000")
        ).to.be.revertedWith("FeeManager: invalid tokenFeeRate");

        await expect(
            feeManager
                .connect(wallet)
                .setIntegratorFee(other.address, wallet.address, "100000000000", 100, "10001", "6000")
        ).to.be.revertedWith("FeeManager: invalid  routerShare");

        await expect(
            feeManager
                .connect(wallet)
                .setIntegratorFee(other.address, wallet.address, "100000000000", 100, "6000", "6000")
        ).to.emit(feeManager, "SetIntegratorFeeRate");
        let f = await feeManager.feeInfoList(other.address);
        expect(f.receiver).eq(wallet.address);
        expect(f.fixedNative).eq("100000000000");
        expect(f.tokenFeeRate).eq(100);
        expect(f.routerShare).eq(6000);
        expect(f.routerNativeShare).eq(6000);
    });

    it("getAmountBeforeFee", async () => {
        let [wallet, other] = await ethers.getSigners();
        await deployFixture();

        await expect(
            feeManager.connect(wallet).setRouterFee(other.address, "100000000000", 100, "6000", "6000")
        ).to.emit(feeManager, "SetIntegratorFeeRate");

        await expect(
            feeManager
                .connect(wallet)
                .setIntegratorFee(other.address, wallet.address, "100000000000", 430, "6000", "6000")
        ).to.emit(feeManager, "SetIntegratorFeeRate");

        let amount = ethers.utils.parseEther("1000");
        console.log(amount);
        let before = await feeManager.getAmountBeforeFee(other.address, token.address, amount, 150);
        console.log(before.beforeAmount);
        let fee = await feeManager.getFee(other.address, token.address, before.beforeAmount, 150);
        let c = before.beforeAmount.sub(fee.routerToken.add(fee.integratorToken));
        expect(c).gte(amount);
        expect(c).lte(amount.add(1));
        console.log("1====", c);

        before = await feeManager.getAmountBeforeFee(wallet.address, token.address, amount, 150);
        console.log(before.beforeAmount);
        fee = await feeManager.getFee(wallet.address, token.address, before.beforeAmount, 150);
        c = before.beforeAmount.sub(fee.routerToken.add(fee.integratorToken));
        expect(c).gte(amount);
        expect(c).lte(amount.add(1));
        console.log("2====", c);

        before = await feeManager.getAmountBeforeFee(other.address, ethers.constants.AddressZero, amount, 150);
        console.log(before.beforeAmount);
        fee = await feeManager.getFee(other.address, ethers.constants.AddressZero, before.beforeAmount, 150);
        c = before.beforeAmount.sub(
            fee.routerToken.add(fee.integratorToken.add(fee.routerNative.add(fee.integratorNative)))
        );
        expect(c).gte(amount);
        expect(c).lte(amount.add(1));
        console.log("3====", c);

        before = await feeManager.getAmountBeforeFee(wallet.address, ethers.constants.AddressZero, amount, 150);
        console.log(before.beforeAmount);
        fee = await feeManager.getFee(wallet.address, ethers.constants.AddressZero, before.beforeAmount, 150);
        c = before.beforeAmount.sub(
            fee.routerToken.add(fee.integratorToken.add(fee.routerNative.add(fee.integratorNative)))
        );
        expect(c).gte(amount);
        expect(c).lte(amount.add(1));
        console.log("4====", c);
    });
});
