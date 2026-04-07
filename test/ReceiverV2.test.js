"use strict";

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("ReceiverV2", function () {
    async function deployFixture() {
        const [owner, user, keeper, other] = await ethers.getSigners();

        const MockToken = await ethers.getContractFactory("MockToken");
        const wToken = await MockToken.deploy("Wrapped Token", "WETH");
        await wToken.deployed();

        const srcToken = await MockToken.deploy("Src Token", "SRC");
        await srcToken.deployed();

        // PayMock serves as a deployed contract (satisfies isContract check for bridge)
        const PayMock = await ethers.getContractFactory("PayMock");
        const bridgeMock = await PayMock.deploy();
        await bridgeMock.deployed();

        const payMock = await PayMock.deploy();
        await payMock.deployed();

        const ReceiverV2Factory = await ethers.getContractFactory("ReceiverV2");
        const receiver = await ReceiverV2Factory.deploy(owner.address, wToken.address, bridgeMock.address);
        await receiver.deployed();

        await (await receiver.updateKeepers(keeper.address, true)).wait();

        return { receiver, wToken, srcToken, bridgeMock, payMock, owner, user, keeper, other };
    }

    // Impersonate a contract address so it can send transactions
    async function impersonateBridge(bridgeAddr) {
        await network.provider.send("hardhat_setBalance", [bridgeAddr, "0x1000000000000000000"]);
        await network.provider.request({ method: "hardhat_impersonateAccount", params: [bridgeAddr] });
        return ethers.getSigner(bridgeAddr);
    }

    async function stopImpersonating(addr) {
        await network.provider.request({ method: "hardhat_stopImpersonatingAccount", params: [addr] });
    }

    // ABI-encode a CallbackParam struct
    function encodeCallbackData(target, approveTo, offset, extraNativeAmount, receiverAddr, data) {
        return ethers.utils.defaultAbiCoder.encode(
            ["tuple(address,address,uint256,uint256,address,bytes)"],
            [[target, approveTo, offset, extraNativeAmount, receiverAddr, data]]
        );
    }

    // ABI-encode the swapAndCall payload (swapData + callbackData pair)
    function encodeSwapAndCall(swapData, callbackData) {
        return ethers.utils.defaultAbiCoder.encode(["bytes", "bytes"], [swapData, callbackData]);
    }

    // ─── Deployment ────────────────────────────────────────────────────────────

    describe("Deployment", function () {
        it("sets owner correctly", async function () {
            const { receiver, owner } = await loadFixture(deployFixture);
            expect(await receiver.owner()).to.equal(owner.address);
        });

        it("sets bridgeAddress correctly", async function () {
            const { receiver, bridgeMock } = await loadFixture(deployFixture);
            expect(await receiver.bridgeAddress()).to.equal(bridgeMock.address);
        });

        it("sets default gasForReFund to 80000", async function () {
            const { receiver } = await loadFixture(deployFixture);
            expect(await receiver.gasForReFund()).to.equal(80000);
        });

        it("reverts on zero owner address", async function () {
            const { wToken, bridgeMock } = await loadFixture(deployFixture);
            const ReceiverV2Factory = await ethers.getContractFactory("ReceiverV2");
            await expect(
                ReceiverV2Factory.deploy(ethers.constants.AddressZero, wToken.address, bridgeMock.address)
            ).to.be.reverted;
        });

        it("reverts if wToken is not a contract", async function () {
            const { bridgeMock, owner, other } = await loadFixture(deployFixture);
            const ReceiverV2Factory = await ethers.getContractFactory("ReceiverV2");
            await expect(
                ReceiverV2Factory.deploy(owner.address, other.address, bridgeMock.address)
            ).to.be.reverted;
        });

        it("reverts if bridgeAddress is not a contract", async function () {
            const { wToken, owner, other } = await loadFixture(deployFixture);
            const ReceiverV2Factory = await ethers.getContractFactory("ReceiverV2");
            await expect(
                ReceiverV2Factory.deploy(owner.address, wToken.address, other.address)
            ).to.be.reverted;
        });
    });

    // ─── setAuthorization ──────────────────────────────────────────────────────

    describe("setAuthorization", function () {
        it("reverts if caller is not owner", async function () {
            const { receiver, bridgeMock, other } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(other).setAuthorization([bridgeMock.address], true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("reverts if executors array is empty", async function () {
            const { receiver } = await loadFixture(deployFixture);
            await expect(receiver.setAuthorization([], true)).to.be.reverted;
        });

        it("reverts if executor is not a contract", async function () {
            const { receiver, user } = await loadFixture(deployFixture);
            await expect(receiver.setAuthorization([user.address], true)).to.be.reverted;
        });

        it("approves executor and emits Approve", async function () {
            const { receiver, bridgeMock } = await loadFixture(deployFixture);
            await expect(receiver.setAuthorization([bridgeMock.address], true))
                .to.emit(receiver, "Approve")
                .withArgs(bridgeMock.address, true);
            expect(await receiver.approved(bridgeMock.address)).to.be.true;
        });

        it("revokes approval and emits Approve", async function () {
            const { receiver, bridgeMock } = await loadFixture(deployFixture);
            await receiver.setAuthorization([bridgeMock.address], true);
            await expect(receiver.setAuthorization([bridgeMock.address], false))
                .to.emit(receiver, "Approve")
                .withArgs(bridgeMock.address, false);
            expect(await receiver.approved(bridgeMock.address)).to.be.false;
        });

        it("approves multiple executors in one call", async function () {
            const { receiver, bridgeMock, payMock } = await loadFixture(deployFixture);
            await receiver.setAuthorization([bridgeMock.address, payMock.address], true);
            expect(await receiver.approved(bridgeMock.address)).to.be.true;
            expect(await receiver.approved(payMock.address)).to.be.true;
        });
    });

    // ─── updateKeepers ─────────────────────────────────────────────────────────

    describe("updateKeepers", function () {
        it("reverts if caller is not owner", async function () {
            const { receiver, other, user } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(other).updateKeepers(user.address, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("reverts if keeper is zero address", async function () {
            const { receiver } = await loadFixture(deployFixture);
            await expect(receiver.updateKeepers(ethers.constants.AddressZero, true)).to.be.reverted;
        });

        it("adds keeper and emits UpdateKeepers", async function () {
            const { receiver, user } = await loadFixture(deployFixture);
            await expect(receiver.updateKeepers(user.address, true))
                .to.emit(receiver, "UpdateKeepers")
                .withArgs(user.address, true);
            expect(await receiver.keepers(user.address)).to.be.true;
        });

        it("removes keeper and emits UpdateKeepers", async function () {
            const { receiver, keeper } = await loadFixture(deployFixture);
            await expect(receiver.updateKeepers(keeper.address, false))
                .to.emit(receiver, "UpdateKeepers")
                .withArgs(keeper.address, false);
            expect(await receiver.keepers(keeper.address)).to.be.false;
        });
    });

    // ─── setBridgeAddress ──────────────────────────────────────────────────────

    describe("setBridgeAddress", function () {
        it("reverts if caller is not owner", async function () {
            const { receiver, bridgeMock, other } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(other).setBridgeAddress(bridgeMock.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("reverts if address is not a contract", async function () {
            const { receiver, other } = await loadFixture(deployFixture);
            await expect(receiver.setBridgeAddress(other.address)).to.be.reverted;
        });

        it("updates bridgeAddress and emits SetBridgeAddress", async function () {
            const { receiver, payMock } = await loadFixture(deployFixture);
            await expect(receiver.setBridgeAddress(payMock.address))
                .to.emit(receiver, "SetBridgeAddress")
                .withArgs(payMock.address);
            expect(await receiver.bridgeAddress()).to.equal(payMock.address);
        });
    });

    // ─── setGasForReFund ───────────────────────────────────────────────────────

    describe("setGasForReFund", function () {
        it("reverts if caller is not owner", async function () {
            const { receiver, other } = await loadFixture(deployFixture);
            await expect(receiver.connect(other).setGasForReFund(100000)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("updates gasForReFund and emits SetGasForReFund", async function () {
            const { receiver } = await loadFixture(deployFixture);
            const newGas = 150000;
            await expect(receiver.setGasForReFund(newGas))
                .to.emit(receiver, "SetGasForReFund")
                .withArgs(newGas);
            expect(await receiver.gasForReFund()).to.equal(newGas);
        });
    });

    // ─── editFuncBlackList ─────────────────────────────────────────────────────

    describe("editFuncBlackList", function () {
        it("reverts if caller is not owner", async function () {
            const { receiver, other } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(other).editFuncBlackList("0x12345678", true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("adds to blacklist and emits EditFuncBlackList", async function () {
            const { receiver } = await loadFixture(deployFixture);
            const funcSig = "0x12345678";
            await expect(receiver.editFuncBlackList(funcSig, true))
                .to.emit(receiver, "EditFuncBlackList")
                .withArgs(funcSig, true);
            expect(await receiver.funcBlackList(funcSig)).to.be.true;
        });

        it("removes from blacklist (transfer selector is blacklisted by default)", async function () {
            const { receiver } = await loadFixture(deployFixture);
            // 0xa9059cbb = transfer(address,uint256) — blacklisted in constructor
            expect(await receiver.funcBlackList("0xa9059cbb")).to.be.true;
            await expect(receiver.editFuncBlackList("0xa9059cbb", false))
                .to.emit(receiver, "EditFuncBlackList")
                .withArgs("0xa9059cbb", false);
            expect(await receiver.funcBlackList("0xa9059cbb")).to.be.false;
        });
    });

    // ─── rescueFunds ───────────────────────────────────────────────────────────

    describe("rescueFunds", function () {
        it("reverts if caller is not owner", async function () {
            const { receiver, srcToken, other } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(other).rescueFunds(srcToken.address, 100)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("transfers ERC20 tokens to owner", async function () {
            const { receiver, srcToken, owner } = await loadFixture(deployFixture);
            const amount = ethers.utils.parseEther("10");
            await srcToken.transfer(receiver.address, amount);

            const ownerBefore = await srcToken.balanceOf(owner.address);
            await receiver.rescueFunds(srcToken.address, amount);
            const ownerAfter = await srcToken.balanceOf(owner.address);

            expect(ownerAfter.sub(ownerBefore)).to.equal(amount);
        });

        it("transfers native ETH to owner", async function () {
            const { receiver, owner } = await loadFixture(deployFixture);
            const amount = ethers.utils.parseEther("1");
            await owner.sendTransaction({ to: receiver.address, value: amount });

            const ownerBefore = await owner.getBalance();
            const tx = await receiver.rescueFunds(ethers.constants.AddressZero, amount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            const ownerAfter = await owner.getBalance();

            expect(ownerAfter.add(gasUsed).sub(ownerBefore)).to.equal(amount);
        });
    });

    // ─── doSwapAndCall (self-only) ─────────────────────────────────────────────

    describe("doSwapAndCall", function () {
        it("reverts if caller is not address(this)", async function () {
            const { receiver, srcToken, user } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(user).doSwapAndCall(
                    ethers.constants.HashZero,
                    srcToken.address,
                    0,
                    1,
                    "0x",
                    "0x",
                    "0x"
                )
            ).to.be.reverted;
        });
    });

    // ─── remoteCall (self-only) ────────────────────────────────────────────────

    describe("remoteCall", function () {
        it("reverts if caller is not address(this)", async function () {
            const { receiver, srcToken, user } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(user).remoteCall(srcToken.address, 100, "0x1234")
            ).to.be.reverted;
        });
    });

    // ─── onReceived ────────────────────────────────────────────────────────────

    describe("onReceived", function () {
        it("reverts if caller is not bridge", async function () {
            const { receiver, srcToken, user } = await loadFixture(deployFixture);
            const swapAndCall = encodeSwapAndCall("0x", "0x1234");
            await expect(
                receiver.connect(user).onReceived(
                    ethers.constants.HashZero, srcToken.address, 1, 1, "0x", swapAndCall
                )
            ).to.be.reverted;
        });

        it("reverts if both swapData and callbackData are empty", async function () {
            const { receiver, srcToken, bridgeMock } = await loadFixture(deployFixture);
            const bridgeSigner = await impersonateBridge(bridgeMock.address);
            const swapAndCall = encodeSwapAndCall("0x", "0x");

            await expect(
                receiver.connect(bridgeSigner).onReceived(
                    ethers.constants.HashZero, srcToken.address, 0, 1, "0x", swapAndCall
                )
            ).to.be.reverted;

            await stopImpersonating(bridgeMock.address);
        });

        it("stores failed swap and emits SwapFailed when gasForReFund exceeds gasleft", async function () {
            const { receiver, srcToken, bridgeMock, user, other } = await loadFixture(deployFixture);

            const amount = ethers.utils.parseEther("10");
            await srcToken.transfer(receiver.address, amount);

            // Force the storage path: set gasForReFund so high that gasleft() never exceeds it
            await receiver.setGasForReFund(ethers.constants.MaxUint256);

            const orderId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("order_store"));
            const fromChain = 1;
            const from = "0x";
            const callbackData = encodeCallbackData(other.address, other.address, 0, 0, user.address, "0x");
            const swapAndCall = encodeSwapAndCall("0x", callbackData);

            const bridgeSigner = await impersonateBridge(bridgeMock.address);

            await expect(
                receiver.connect(bridgeSigner).onReceived(
                    orderId, srcToken.address, amount, fromChain, from, swapAndCall
                )
            ).to.emit(receiver, "SwapFailed");

            expect(await receiver.storedFailedSwap(orderId)).to.not.equal(ethers.constants.HashZero);

            await stopImpersonating(bridgeMock.address);
        });

        it("executes callback-only path successfully and emits RemoteSwapAndCall", async function () {
            // When callback target is not approved, remoteCall fails but is caught internally.
            // doSwapAndCall still succeeds: tokens are forwarded to callbackData.receiver.
            const { receiver, srcToken, bridgeMock, user, other } = await loadFixture(deployFixture);

            const amount = ethers.utils.parseEther("5");
            await srcToken.transfer(receiver.address, amount);

            const orderId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("order_exec"));
            const fromChain = 1;
            const from = "0x";
            // target (other.address) is not approved → remoteCall reverts → caught → tokens sent to user
            const callbackData = encodeCallbackData(other.address, other.address, 0, 0, user.address, "0x1234");
            const swapAndCall = encodeSwapAndCall("0x", callbackData);

            const bridgeSigner = await impersonateBridge(bridgeMock.address);
            const userBalanceBefore = await srcToken.balanceOf(user.address);

            await expect(
                receiver.connect(bridgeSigner).onReceived(
                    orderId, srcToken.address, amount, fromChain, from, swapAndCall
                )
            ).to.emit(receiver, "RemoteSwapAndCall");

            // All tokens forwarded to receiver (user) since callback failed internally
            const userBalanceAfter = await srcToken.balanceOf(user.address);
            expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(amount);

            // No failed swap hash stored
            expect(await receiver.storedFailedSwap(orderId)).to.equal(ethers.constants.HashZero);

            await stopImpersonating(bridgeMock.address);
        });

        it("reverts if receiver balance is less than declared amount (RECEIVE_LOW)", async function () {
            const { receiver, srcToken, bridgeMock, user, other } = await loadFixture(deployFixture);

            // Do NOT transfer tokens — receiver has nothing
            const amount = ethers.utils.parseEther("10");
            const orderId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("order_low"));
            const callbackData = encodeCallbackData(other.address, other.address, 0, 0, user.address, "0x");
            const swapAndCall = encodeSwapAndCall("0x", callbackData);

            const bridgeSigner = await impersonateBridge(bridgeMock.address);

            // doSwapAndCall is tried, fails with RECEIVE_LOW, caught, then _store is called
            // (The tx itself should not revert at the onReceived level — it stores instead)
            await expect(
                receiver.connect(bridgeSigner).onReceived(
                    orderId, srcToken.address, amount, 1, "0x", swapAndCall
                )
            ).to.emit(receiver, "SwapFailed");

            await stopImpersonating(bridgeMock.address);
        });
    });

    // ─── swapRescueFunds ───────────────────────────────────────────────────────

    describe("swapRescueFunds", function () {
        it("reverts if caller is not a keeper", async function () {
            const { receiver, srcToken, user } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(user).swapRescueFunds(
                    ethers.constants.HashZero, 1, srcToken.address, 100,
                    srcToken.address, user.address, "0x", "0x"
                )
            ).to.be.reverted;
        });

        it("reverts if rescue receiver is zero address", async function () {
            const { receiver, srcToken, keeper } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(keeper).swapRescueFunds(
                    ethers.constants.HashZero, 1, srcToken.address, 100,
                    srcToken.address, ethers.constants.AddressZero, "0x", "0x"
                )
            ).to.be.reverted;
        });

        it("reverts if hash does not match stored value (INVALID_EXEC_PARAM)", async function () {
            const { receiver, srcToken, keeper, user } = await loadFixture(deployFixture);
            // storedFailedSwap[orderId] is zero — hash will never match
            await expect(
                receiver.connect(keeper).swapRescueFunds(
                    ethers.constants.HashZero, 1, srcToken.address, 100,
                    srcToken.address, user.address, "0x", "0x"
                )
            ).to.be.reverted;
        });

        it("rescues funds after failed onReceived, clears stored hash, emits SwapRescueFunds", async function () {
            const { receiver, srcToken, bridgeMock, keeper, user, other } = await loadFixture(deployFixture);

            const amount = ethers.utils.parseEther("10");
            await srcToken.transfer(receiver.address, amount);

            // Force storage path
            await receiver.setGasForReFund(ethers.constants.MaxUint256);

            const orderId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("rescue_order"));
            const fromChain = ethers.BigNumber.from(1);
            const from = "0x";
            const callbackData = encodeCallbackData(other.address, other.address, 0, 0, user.address, "0x");
            const swapAndCall = encodeSwapAndCall("0x", callbackData);

            // Trigger storage via onReceived
            const bridgeSigner = await impersonateBridge(bridgeMock.address);
            await (
                await receiver.connect(bridgeSigner).onReceived(
                    orderId, srcToken.address, amount, fromChain, from, swapAndCall
                )
            ).wait();
            await stopImpersonating(bridgeMock.address);

            expect(await receiver.storedFailedSwap(orderId)).to.not.equal(ethers.constants.HashZero);

            const userBalanceBefore = await srcToken.balanceOf(user.address);

            // Rescue: _dscToken = srcToken (dstToken == srcToken when no swap), receiver = user
            await expect(
                receiver.connect(keeper).swapRescueFunds(
                    orderId,
                    fromChain,
                    srcToken.address,
                    amount,
                    srcToken.address, // _dscToken must match what was stored
                    user.address,     // receiver must match callbackData.receiver
                    from,
                    callbackData
                )
            ).to.emit(receiver, "SwapRescueFunds");

            const userBalanceAfter = await srcToken.balanceOf(user.address);
            expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(amount);

            // Hash cleared after rescue
            expect(await receiver.storedFailedSwap(orderId)).to.equal(ethers.constants.HashZero);
        });

        it("reverts on second rescue attempt (hash already cleared)", async function () {
            const { receiver, srcToken, bridgeMock, keeper, user, other } = await loadFixture(deployFixture);

            const amount = ethers.utils.parseEther("10");
            await srcToken.transfer(receiver.address, amount);
            await receiver.setGasForReFund(ethers.constants.MaxUint256);

            const orderId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("double_rescue"));
            const fromChain = ethers.BigNumber.from(1);
            const from = "0x";
            const callbackData = encodeCallbackData(other.address, other.address, 0, 0, user.address, "0x");
            const swapAndCall = encodeSwapAndCall("0x", callbackData);

            const bridgeSigner = await impersonateBridge(bridgeMock.address);
            await (
                await receiver.connect(bridgeSigner).onReceived(
                    orderId, srcToken.address, amount, fromChain, from, swapAndCall
                )
            ).wait();
            await stopImpersonating(bridgeMock.address);

            // First rescue succeeds
            await receiver.connect(keeper).swapRescueFunds(
                orderId, fromChain, srcToken.address, amount,
                srcToken.address, user.address, from, callbackData
            );

            // Second rescue should revert — hash cleared
            await expect(
                receiver.connect(keeper).swapRescueFunds(
                    orderId, fromChain, srcToken.address, amount,
                    srcToken.address, user.address, from, callbackData
                )
            ).to.be.reverted;
        });
    });

    // ─── execSwap ──────────────────────────────────────────────────────────────

    describe("execSwap", function () {
        it("reverts if caller is not a keeper", async function () {
            const { receiver, srcToken, user } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(user).execSwap(
                    ethers.constants.HashZero, 1, srcToken.address, 100, "0x", "0x1234", "0x"
                )
            ).to.be.reverted;
        });

        it("reverts if swapData is empty (DATA_EMPTY)", async function () {
            const { receiver, srcToken, keeper } = await loadFixture(deployFixture);
            await expect(
                receiver.connect(keeper).execSwap(
                    ethers.constants.HashZero, 1, srcToken.address, 100, "0x", "0x", "0x"
                )
            ).to.be.reverted;
        });
    });
});
