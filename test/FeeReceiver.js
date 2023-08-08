
let { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
let { BigNumber } = require("ethers");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");


let ERC20 = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint value) external returns (bool)'
]


describe("FeeReceiver", function () {
    let feeReceiver;
    let convert;
    let owner;
    let shares1;
    let shares2;
    let token1;
    let token2;
    async function deployFixture() {
        [owner,shares1,shares2] = await ethers.getSigners();
        let FeeReceiver = await ethers.getContractFactory("FeeReceiver");
        feeReceiver = await FeeReceiver.deploy([shares1.address,shares2.address],[40,60],owner.address);
        await feeReceiver.deployed();
        let MockToken = await ethers.getContractFactory("MockToken");
        token1 = await MockToken.deploy("Token1","T1");
        await token1.deployed();
        await (await token1.connect(owner).transfer(feeReceiver.address,ethers.utils.parseEther("10000"))).wait();
        token2 = await MockToken.deploy("Token2","T2");
        await token2.deployed();
        await (await token2.connect(owner).transfer(feeReceiver.address,ethers.utils.parseEther("10000"))).wait();
        let tx = {
            to: feeReceiver.address,
            value: ethers.utils.parseEther('1', 'ether')
        };
        await owner.sendTransaction(tx);
        let Convert = await ethers.getContractFactory("MockConvert");
        convert = await Convert.deploy(token1.address,token2.address);
        await (await token1.connect(owner).transfer(convert.address,ethers.utils.parseEther("10000"))).wait();
        await (await token2.connect(owner).transfer(convert.address,ethers.utils.parseEther("10000"))).wait();
    }


    it("editConverter -> revert Ownable: caller is not the owner", async () => {
        await deployFixture();
        await expect(feeReceiver.connect(shares1).editConverter(shares1.address,true)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("addStablecoins -> revert Ownable: caller is not the owner", async () => {
        await deployFixture();
        await expect(feeReceiver.connect(shares1).addStablecoins(token1.address)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    it("addStablecoins -> correct", async () => {
        await deployFixture();
        await expect(feeReceiver.connect(owner).addStablecoins(token1.address)).to.be.emit(feeReceiver, "AddStablecoin");
        let stable = await feeReceiver.stablecoins(token1.address);
        expect(stable).to.be.true;
    })

    it("editConverter -> correct", async () => {
        await deployFixture();
        await expect(feeReceiver.connect(owner).editConverter(shares1.address,true)).to.be.emit(feeReceiver, "EditConverter");
        let c = await feeReceiver.converters(shares1.address);
        expect(c).to.be.true;
    })

    it("overView", async () => {
        await deployFixture();
        let totalShares = await feeReceiver.totalShares();
        expect(totalShares).to.be.eq(100);
        let payee1 = await feeReceiver.payee(0);
        let payee2 = await feeReceiver.payee(1);
        expect(payee1).to.be.eq(shares1.address);
        expect(payee2).to.be.eq(shares2.address);
    })

    it("release -> revert account has no shares", async () => {
        await deployFixture();
        await expect(feeReceiver.connect(owner).release(token1.address,owner.address)).to.be.revertedWith("account has no shares")
    })

    it("release -> revert unsuport release token", async () => {
        await deployFixture();
        await expect(feeReceiver.connect(shares1).release(token1.address,owner.address)).to.be.revertedWith("account has no shares")
    })
    
    it("release -> correct", async () => {
        await deployFixture();
        await (await  feeReceiver.connect(owner).addStablecoins(token1.address)).wait()
        let balanceBefore = await token1.balanceOf(shares1.address);
        expect(balanceBefore).to.be.eq(0)
        await expect(feeReceiver.connect(shares1).release(token1.address,shares1.address)).to.be.emit(feeReceiver,"PaymentReleased")
        let balanceAfter = await token1.balanceOf(shares1.address);
        expect(balanceAfter).to.be.eq(ethers.utils.parseEther("4000"))
    })

    it("convertToStablecoin -> convert deny", async () => {
        await deployFixture();
        let Convert = await ethers.getContractFactory("MockConvert");
        let convertParam = {
            token:token1.address,
            callTo:convert.address,
            approveTo:convert.address,
            playload:Convert.interface.encodeFunctionData("convert",[token1.address,token2.address,ethers.utils.parseEther("4000")])
        }

        await expect(feeReceiver.connect(shares1).convertToStablecoin([convertParam])).to.be.revertedWith("convert deny")
    })


    it("convertToStablecoin -> not need convert", async () => {
        await deployFixture();
        let Convert = await ethers.getContractFactory("MockConvert");
        let convertParam = {
            token:token1.address,
            callTo:convert.address,
            approveTo:convert.address,
            playload:Convert.interface.encodeFunctionData("convert",[token1.address,token2.address,ethers.utils.parseEther("4000")])
        }
        await (await  feeReceiver.connect(owner).addStablecoins(token1.address)).wait()
        await expect(feeReceiver.convertToStablecoin([convertParam])).to.be.revertedWith("not need convert")
    })

    it("convertToStablecoin -> correct", async () => {
        await deployFixture();
        let Convert = await ethers.getContractFactory("MockConvert");
        let convertParam = {
            token:token1.address,
            callTo:convert.address,
            approveTo:convert.address,
            playload:Convert.interface.encodeFunctionData("convert",[token1.address,token2.address,ethers.utils.parseEther("4000")])
        }
        let balanceBefore = await token1.balanceOf(convert.address);
        await expect(feeReceiver.connect(owner).convertToStablecoin([convertParam])).to.be.emit(feeReceiver,"ConvertTo")
        let balanceAfter = await token1.balanceOf(convert.address);

        expect(balanceAfter).to.be.gt(balanceBefore)
    })
    
})