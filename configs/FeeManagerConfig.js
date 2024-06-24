let feeManagerConfig = new Map([
    [
        "Eth",
        {
            receiver: "0xbd3fa81b58ba92a82136038b25adec7066af3155",
            fixedNative: "10000000", // wei
            tokenFeeRate: "100", // div 10000
            routerShare: "6000", // div 10000
            routerNativeShare: "6000", // div 10000
        },
    ],
    [
        "Avalanche",
        {
            receiver: "0xbd3fa81b58ba92a82136038b25adec7066af3155",
            fixedNative: "10000000", // wei
            tokenFeeRate: "100", // div 10000
            routerShare: "6000", // div 10000
            routerNativeShare: "6000", // div 10000
        },
    ],

    [
        "Makalu",
        {
            receiver: "0xbd3fa81b58ba92a82136038b25adec7066af3155",
            fixedNative: "10000000", // wei
            tokenFeeRate: "100", // div 10000
            routerShare: "6000", // div 10000
            routerNativeShare: "6000", // div 10000
        },
    ],

    [
        "TronTest",
        {
            receiver: "0xbd3fa81b58ba92a82136038b25adec7066af3155",
            fixedNative: "10000000", // wei
            tokenFeeRate: "100", // div 10000
            routerShare: "6000", // div 10000
            routerNativeShare: "6000", // div 10000
        },
    ],
]);

exports.getFeeManagerConfig = function (network) {
    return feeManagerConfig.get(network);
};
