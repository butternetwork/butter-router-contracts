//wToken,mos,and executors make sure these addresses must be contract;
let config = new Map([
    [
        "Eth",
        {
            wToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [
                    "0x0000000022D53366457F9d5E68Ec105046FC4383", //curve
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch
                    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F", //sushi
                    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", //univ2
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564", //univ3
                ],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "6000000000000000",
                },
                executors: [
                    "0x0000000022D53366457F9d5E68Ec105046FC4383", //curve
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch v5
                    "0x111111125421cA6dc452d289314280a0f8842A65", //1inch v6
                    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F", //sushi
                    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", //univ2
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564", //univ3
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // open ocean
                    "0x3321dE36B6C29A6fa102A67bd5C48E5756Baa596", // omni adapter
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],

    [
        "Bsc",
        {
            wToken: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch
                    "0x10ED43C718714eb63d5aA57B78B54704E256024E", //pancake
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", //sushi
                ],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "40000000000000000",
                },
                executors: [
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch v5
                    "0x111111125421cA6dc452d289314280a0f8842A65", //1inch v6
                    "0x10ED43C718714eb63d5aA57B78B54704E256024E", //pancake
                    "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2", //uni SwapRouter02
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", //sushi
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x3321dE36B6C29A6fa102A67bd5C48E5756Baa596", // omni adapter
                    "0xedf2021f41AbCfE2dEA4427E1B61f4d0AA5aA4b8", //izumi
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],

    [
        "Matic",
        {
            wToken: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch
                    "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", //quick
                    "0xf5b509bB0909a69B1c207E495f687a596C168E12", //quickv3
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", //sushi
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564", //univ3
                ],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "40000000000000000000",
                },
                executors: [
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch v5
                    "0x111111125421cA6dc452d289314280a0f8842A65", //1inch v6
                    "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", //quick
                    "0xf5b509bB0909a69B1c207E495f687a596C168E12", //quickv3
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", //sushi
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564", //univ3
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x032b241De86a8660f1Ae0691a4760B426EA246d7", //izumi

                    "0xaaab45a0ea5d8615411877178de9fa7a54068dde", // chain pool
                    "0x63d13711AFcD6Ddd07154c19F020b490C25bDCD0", // chain pool v2
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],

    [
        "Klaytn",
        {
            wToken: "0x19aac5f612f524b754ca7e7c41cbfa2e981a4432",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [
                    "0xEf71750C100f7918d6Ded239Ff1CF09E81dEA92D", // claimswap
                    "0xe0fbB27D0E7F3a397A67a9d4864D4f4DD7cF8cB9", // klayswap
                ],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "120000000000000000000",
                },
                executors: [
                    "0xEf71750C100f7918d6Ded239Ff1CF09E81dEA92D", //claimswap
                    "0xe0fbB27D0E7F3a397A67a9d4864D4f4DD7cF8cB9", // klayswap
                    "0x3EF68D3f7664b2805D4E88381b64868a56f88bC4", // izumi
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch v5
                    "0x111111125421cA6dc452d289314280a0f8842A65", //1inch v6
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],

    [
        "Conflux",
        {
            wToken: "0x14b2d3bc65e74dae1030eafd8ac30c533c976a9b",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [
                    "0x62b0873055bf896dd869e172119871ac24aea305", //Swappi
                ],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "120000000000000000000",
                },
                executors: [
                    "0x62b0873055bf896dd869e172119871ac24aea305", //Swappi
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],

    [
        "Map",
        {
            wToken: "0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [
                    "0x0bce9e0ebd4fd4d6562495af45c4aaa0c1f7f3d7", //hiveswap
                ],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "2000000000000000000000",
                },
                executors: [
                    "0x0bce9e0ebd4fd4d6562495af45c4aaa0c1f7f3d7", //hiveswap v2
                    "0x3EF68D3f7664b2805D4E88381b64868a56f88bC4", //hiveswap pro
                    "0x6628a22D9E16E42225a46ceaDd93dACFefAcfE1b", //hiveswap v3
                    "0x3321dE36B6C29A6fa102A67bd5C48E5756Baa596", // omni adapter
                    "0x3EF68D3f7664b2805D4E88381b64868a56f88bC4", // izumi

                    "0x63d13711AFcD6Ddd07154c19F020b490C25bDCD0", // chainpool
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],

    [
        "Tron",
        {
            wToken: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR",
            v2: {
                mos: "TYMpgB8Q9vSoGtkyE3hXsvUrpte3KCDGj6",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [
                    "TFVisXFaijZfeyeSjCEVkHfex7HGdTxzF9", // sun smart router
                    "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax", // sun v2 route
                    "TQAvWQpT9H916GckwWDJNhYZvQMkuRL7PN", // sun v3 route
                ],
            },
            v3: {
                bridge: "TYMpgB8Q9vSoGtkyE3hXsvUrpte3KCDGj6",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "120000000000000000000",
                },
                executors: [
                    "TFVisXFaijZfeyeSjCEVkHfex7HGdTxzF9", // sun smart router
                    "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax", // sun v2 route
                    "TQAvWQpT9H916GckwWDJNhYZvQMkuRL7PN", // sun v3 route
                ],
            },
            removes: [
                "TYMpgB8Q9vSoGtkyE3hXsvUrpte3KCDGj6", // bridge
            ]
        },
    ],

    [
        "Merlin",
        {
            wToken: "0xF6D226f9Dc15d9bB51182815b320D3fBE324e1bA",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "300000000000000",
                },
                executors: [
                    "0x1aFa5D7f89743219576Ef48a9826261bE6378a68", //izumi
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],
    [
        "Blast",
        {
            wToken: "0x4300000000000000000000000000000000000004",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [
                    "0x44889b52b71E60De6ed7dE82E2939fcc52fB2B4E", //Thruster
                ],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "6000000000000000",
                },
                executors: [
                    "0x44889b52b71E60De6ed7dE82E2939fcc52fB2B4E", //Thruster
                    "0xA3F50FeBA40dd3E884688C0AF72C4054D07a1c50", //izumi
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //openocean
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],
    [
        "Base",
        {
            wToken: "0x4200000000000000000000000000000000000006",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [
                    "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", //Aerodrome Router
                    "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // UniSwap UniversalRouter
                ],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "6000000000000000",
                },
                executors: [
                    "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", //Aerodrome Router
                    "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // UniSwap UniversalRouter
                    "0x02F55D53DcE23B4AA962CC68b0f685f26143Bdb2", // izumi
                    "0x6352a56caadc4f1e25cd6c75970fa768a3304e64", // openocean
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch v5
                    "0x111111125421cA6dc452d289314280a0f8842A65", //1inch v6
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],
    [
        "Optimism",
        {
            wToken: "0x4200000000000000000000000000000000000006",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "6000000000000000",
                },
                executors: [
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch v5
                    "0x111111125421cA6dc452d289314280a0f8842A65", //1inch v6
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],
    [
        "Arbitrum",
        {
            wToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "6000000000000000",
                },
                executors: [
                    "0x1111111254eeb25477b68fb85ed929f73a960582", //1inch v5
                    "0x111111125421cA6dc452d289314280a0f8842A65", //1inch v6
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564", //univ3
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x01fDea353849cA29F778B2663BcaCA1D191bED0e", //izumi
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],
    [
        "Linea",
        {
            wToken: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "6000000000000000",
                },
                executors: [
                    "0x032b241De86a8660f1Ae0691a4760B426EA246d7", //izumi
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //openocean
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],
    [
        "Scroll",
        {
            wToken: "0x5300000000000000000000000000000000000004",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "6000000000000000",
                },
                executors: [
                    "0x2db0AFD0045F3518c77eC6591a542e326Befd3D7", //izumi
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //openocean
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],
    [
        "Mantle",
        {
            wToken: "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "20000000000000000000",
                },
                executors: [
                    "0x25C030116Feb2E7BbA054b9de0915E5F51b03e31", //izumi
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //openocean
                ],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],
    [
        "Ainn",
        {
            wToken: "0x1470a4831F76954686BfB4dE8180F7469EA8dE6F",
            v2: {
                mos: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [],
            },
            v3: {
                bridge: "0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "300000000000000",
                },
                executors: [],
            },
            removes: [
                "0xfeB2b97e4Efce787c08086dC16Ab69E063911380", // bridge
            ]
        },
    ],
    [
        "zkSync",
        {
            wToken: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
            v2: {
                mos: "0xBEf06a32166C4B819fF04cCfa887733B8bb67eB5",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    feeRate: "0", //denominator is 1000000
                    fixedFee: "0",
                },
                executors: [],
            },
            v3: {
                bridge: "0xBEf06a32166C4B819fF04cCfa887733B8bb67eB5",
                fee: {
                    receiver: "0x51C700e5bE790C91F14D42F85ca90aed9f2D142e",
                    routerFeeRate: "0", //denominator is 10000
                    routerFixedFee: "0",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "6000000000000000",
                },
                executors: [
                    "0x6e2B76966cbD9cF4cC2Fa0D76d24d5241E0ABC2F", //1inch v5
                    "0x6fd4383cB451173D5f9304F041C7BCBf27d561fF", //1inch v6
                    "0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295", //sync-swap
                    "0x943ac2310D9BC703d6AB5e5e76876e212100f894", //izumi
                    "0x36A1aCbbCAfca2468b85011DDD16E7Cb4d673230", //openocean
                ],
            },
            removes: [
                "0xBEf06a32166C4B819fF04cCfa887733B8bb67eB5", // bridge
            ]
        },
    ],

    //<------------------------------------- testnet----------------------------------------->

    [
        "BscTest",
        {
            wToken: "0xae13d989dac2f0debff460ac112a837c89baa7cd",
            v2: {
                mos: "0x3C12F82ea96c855944efe9f3aC4ce18449Aa634B",
                fee: {
                    receiver: "0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                    feeRate: "7000", //denominator is 1000000
                    fixedFee: "100000000",
                },
                executors: [
                    "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x6710b000cc6728e068C095B66535E1A8b552e816",
                ],
            },
            v3: {
                bridge: "",
                fee: {
                    receiver: "0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                    routerFeeRate: "7000", //denominator is 10000
                    routerFixedFee: "100000000",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "1",
                },
                executors: [
                    "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x6710b000cc6728e068C095B66535E1A8b552e816",
                ],
            },
        },
    ],

    [
        "Makalu",
        {
            wToken: "0x2eD27dF9B4c903aB53666CcA59AFB431F7D15e91",
            v2: {
                mos: "0x3D8da6f43e35E05162d874BdaF93f61995A34D81",
                fee: {
                    receiver: "0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                    feeRate: "7000", //denominator is 1000000
                    fixedFee: "100000000",
                },
                executors: ["0xf479BD49E55cf47474056Ef168B0E0709DDF1830"],
            },
            v3: {
                bridge: "",
                fee: {
                    receiver: "0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                    routerFeeRate: "7000", //denominator is 10000
                    routerFixedFee: "100000000",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "1",
                },
                executors: ["0xf479BD49E55cf47474056Ef168B0E0709DDF1830"],
            },
        },
    ],

    [
        "MaticTest",
        {
            wToken: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
            v2: {
                mos: "0x71f38FE43031397C102F10fb857a6D432af10642",
                fee: {
                    receiver: "0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                    feeRate: "7000", //denominator is 1000000
                    fixedFee: "1000000000000000000",
                },
                executors: [
                    "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
                    "0x15e6c86a9ac9a32f91125794fda82eeb807ed818",
                ],
            },
            v3: {
                bridge: "",
                fee: {
                    receiver: "0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                    routerFeeRate: "7000", //denominator is 10000
                    routerFixedFee: "1000000000000000000",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "1",
                },
                executors: [
                    "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
                    "0x15e6c86a9ac9a32f91125794fda82eeb807ed818",
                ],
            },
        },
    ],

    [
        "TronTest",
        {
            wToken: "0xFB3B3134F13CCD2C81F4012E53024E8135D58FEE",
            v2: {
                mos: "0xFB3B3134F13CCD2C81F4012E53024E8135D58FEE",
                fee: {
                    receiver: "0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                    feeRate: "7000", //denominator is 1000000
                    fixedFee: "1000000000000000000",
                },
                executors: ["0xFB3B3134F13CCD2C81F4012E53024E8135D58FEE"],
            },
            v3: {
                bridge: "",
                fee: {
                    receiver: "0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                    routerFeeRate: "7000", //denominator is 10000
                    routerFixedFee: "1000000000000000000",
                    maxReferrerFeeRate: "2000",
                    maxReferrerNativeFee: "1",
                },
                executors: ["0xFB3B3134F13CCD2C81F4012E53024E8135D58FEE"],
            },
        },
    ],
]);

exports.getConfig = function (network) {
    return config.get(network);
};
