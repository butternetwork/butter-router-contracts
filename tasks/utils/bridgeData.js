const { ethers } = require("ethers");

const coder = ethers.AbiCoder.defaultAbiCoder();

// Default referrer (same as prod tx 0x1037272b...71eb0 on Bsc)
const DEFAULT_REFERRER = "0x200aee9ba7040d778922a763ce8a50948d61aff5";
// BridgeParam.receiver used by all observed prod txs; the real end user goes into the gateway payload
const BRIDGE_RECEIVER = "0x14ed4aba3e2da09a34d6495eea6ac8cb9ec44d07";
// 6-byte payload header copied from prod plain-transfer tx 0x9b7b43f8...121493 (Map -> Bsc).
// Meaning is not documented in this repo; override with --header if needed.
const DEFAULT_HEADER = "0x010009001e00";

const DEX_TYPE_FILL = 4;
const WRAP_SELECTOR = "0xd0e30db0"; // deposit()

/**
 * SwapParam that wraps native into wToken via wToken.deposit() (FILL dex type, no amount offsets).
 */
function buildWrapSwapData(wToken, amount, receiver) {
    let fillData = coder.encode(["uint256[]", "bytes"], [[], WRAP_SELECTOR]);
    return coder.encode(
        ["tuple(address,address,address,uint256,tuple(uint8,address,address,uint256,bytes)[])"],
        [[wToken, receiver, receiver, amount, [[DEX_TYPE_FILL, wToken, wToken, amount, fillData]]]]
    );
}

/**
 * Build swapAndBridge args for a plain token transfer (no swap on target chain).
 * If isNative, the native amount is wrapped into wToken first (same as prod Map tx).
 */
function buildBridgeArgs({ initiator, token, amount, toChain, receiver, referrer, header, isNative, wToken }) {
    referrer = ethers.getAddress(referrer);
    header = header || DEFAULT_HEADER;

    // Gateway payload: header ++ abi.encode(bytes to, bytes swapAndCall); empty swapAndCall => plain transfer
    let payload = ethers.concat([header, coder.encode(["bytes", "bytes"], [receiver, "0x"])]);
    // Gateway data: (1, referrer, 0, 0, payload)
    let gatewayData = coder.encode(
        ["tuple(uint256,address,uint256,uint256,bytes)"],
        [[1, referrer, 0, 0, payload]]
    );
    // BridgeParam { toChain, nativeFee, receiver, data }
    let bridgeData = coder.encode(
        ["tuple(uint256,uint256,bytes,bytes)"],
        [[toChain, 0, BRIDGE_RECEIVER, gatewayData]]
    );
    // Fee { feeType: PROPORTION, referrer, rate: 0 }
    let feeData = coder.encode(["uint8", "address", "uint256"], [1, referrer, 0]);

    let srcToken = isNative ? ethers.ZeroAddress : token;
    let swapData = isNative ? buildWrapSwapData(wToken, amount, initiator) : "0x";
    let args = [ethers.ZeroHash, initiator, srcToken, amount, swapData, bridgeData, "0x", feeData];
    let value = isNative ? amount : 0n;
    return { args, value };
}

module.exports = { buildBridgeArgs, DEFAULT_REFERRER, DEFAULT_HEADER, BRIDGE_RECEIVER };
