//wToken,mos,and executors make sure these addresses must be contract;
let config = new Map(
    [
        ["Eth",{
            wToken:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            v2:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000000000000"
                    },
                executors:[
                    "0x8731d54E9D02c286767d56ac03e8037C07e01e98",//stargate
                    "0x150f94B44927F078737562f0fcF3C95c01Cc2376",//stargate eth
                    "0xb1b2eeF380f21747944f46d28f683cD1FBB4d03c",//stargate eth
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",//sushi 
                    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",//univ2
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564",//univ3
                    "0xB4B0ea46Fe0E9e8EAB4aFb765b527739F2718671",//verse
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x4315f344a905dC21a08189A117eFd6E1fcA37D57",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            },
            plus:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000000000000"
                    },
                executors:[
                    "0x8731d54E9D02c286767d56ac03e8037C07e01e98",//stargate
                    "0x150f94B44927F078737562f0fcF3C95c01Cc2376",//stargate eth
                    "0xb1b2eeF380f21747944f46d28f683cD1FBB4d03c",//stargate eth
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",//sushi 
                    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",//univ2
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564",//univ3
                    "0xB4B0ea46Fe0E9e8EAB4aFb765b527739F2718671",//verse
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x4315f344a905dC21a08189A117eFd6E1fcA37D57",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            }
        }],

        ["Avalanche",{
            wToken:"0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
            v2:{
                mos:"0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"12000000000000000000"
                    },
                executors:[
                    "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",//stargate
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve 
                    "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",//joe
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch 
                    "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",//pangolin 
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", //sushi
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x2C86f0FF75673D489b7D72D9986929a2b0Ed596C",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            },
            plus:{
                mos:"0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"12000000000000000000"
                    },
                executors:[
                    "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",//stargate
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve 
                    "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",//joe
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch 
                    "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",//pangolin 
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", //sushi
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x2C86f0FF75673D489b7D72D9986929a2b0Ed596C",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            }
        }],
        
        ["Bsc",{
            wToken:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            v2:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"600000000000000000"
                    },
                executors:[
                    "0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8",//stargate
                    "0x3335733c454805df6a77f825f266e136fb4a3333",//rubic
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0x10ED43C718714eb63d5aA57B78B54704E256024E",//pancake
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x7D26F09d4e2d032Efa0729fC31a4c2Db8a2394b1",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            },
            plus:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"600000000000000000"
                    },
                executors:[
                    "0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8",//stargate
                    "0x3335733c454805df6a77f825f266e136fb4a3333",//rubic
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0x10ED43C718714eb63d5aA57B78B54704E256024E",//pancake
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x7D26F09d4e2d032Efa0729fC31a4c2Db8a2394b1",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            }
        }],
        
        ["Matic",{
            wToken:"0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
            v2:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"200000000000000000000"
                    },
                executors:[
                    "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",//stargate
                    "0x3335733c454805df6a77f825f266e136fb4a3333",//rubic
                    "0x89D6B81A1Ef25894620D05ba843d83B0A296239e",//algebra
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",//quick 
                    "0xf5b509bB0909a69B1c207E495f687a596C168E12",//quickv3 
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564", //univ3
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x0c988b66EdEf267D04f100A879db86cdb7B9A34F",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            },
            plus:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"200000000000000000000"
                    },
                executors:[
                    "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",//stargate
                    "0x3335733c454805df6a77f825f266e136fb4a3333",//rubic
                    "0x89D6B81A1Ef25894620D05ba843d83B0A296239e",//algebra
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",//quick 
                    "0xf5b509bB0909a69B1c207E495f687a596C168E12",//quickv3 
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564", //univ3
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x0c988b66EdEf267D04f100A879db86cdb7B9A34F",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            }
        }],

        ["Arbitrum",{
            wToken:"0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            v2:{
                mos:"0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000000000000"
                    },
                executors:[
                    "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614",//stargate
                    "0xbf22f0f184bCcbeA268dF387a49fF5238dD23E40",//stargate eth
                    "0xb1b2eeF380f21747944f46d28f683cD1FBB4d03c",//stargate eth
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve	
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564", //univ3
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x33383265290421C704c6b09F4BF27ce574DC4203",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            },
            plus:{
                mos:"0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000000000000"
                    },
                executors:[
                    "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614",//stargate
                    "0xbf22f0f184bCcbeA268dF387a49fF5238dD23E40",//stargate eth
                    "0xb1b2eeF380f21747944f46d28f683cD1FBB4d03c",//stargate eth
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve	
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564", //univ3
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x33383265290421C704c6b09F4BF27ce574DC4203",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            }
        }],

        ["Optimism",{
            wToken:"0x4200000000000000000000000000000000000006",
            v2:{
                mos:"0x4200000000000000000000000000000000000006",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000000000000"
                    },
                executors:[
                    "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b",//stargate
                    "0xB49c4e680174E331CB0A7fF3Ab58afC9738d5F8b",//stargate eth
                    "0xb1b2eeF380f21747944f46d28f683cD1FBB4d03c",//stargate eth
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve	
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x7a6e01880693093abACcF442fcbED9E0435f1030",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            },
            plus:{
                mos:"0x4200000000000000000000000000000000000006",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000000000000"
                    },
                executors:[
                    "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b",//stargate
                    "0xB49c4e680174E331CB0A7fF3Ab58afC9738d5F8b",//stargate eth
                    "0xb1b2eeF380f21747944f46d28f683cD1FBB4d03c",//stargate eth
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve	
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0x7a6e01880693093abACcF442fcbED9E0435f1030",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            }
        }],

        ["zkSync",{
            wToken:"0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
            v2:{
                mos:"0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
            fee:{
            receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
            feeRate:"7000",//denominator is 1000000
            fixedFee:"100000000000000000"
                },
            executors:[
                "0x8E70e517057e7380587Ea6990dAe81cB1Ba405ce",//rubic
                "0x8B791913eB07C32779a16750e3868aA8495F5964",//mute 	
                "0x6e2B76966cbD9cF4cC2Fa0D76d24d5241E0ABC2F",//1inch
                "0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295",//sync-swap 
                "0x8E70e517057e7380587Ea6990dAe81cB1Ba405ce",	
                "0xe4e156167cc9C7AC4AbD8d39d203a5495F775547",//xy
            ]
            },
            plus:{
                mos:"0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000000000000"
                    },
                executors:[
                    "0x8E70e517057e7380587Ea6990dAe81cB1Ba405ce",//rubic
                    "0x8B791913eB07C32779a16750e3868aA8495F5964",//mute 	
                    "0x6e2B76966cbD9cF4cC2Fa0D76d24d5241E0ABC2F",//1inch
                    "0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295",//sync-swap 	
                    "0x8E70e517057e7380587Ea6990dAe81cB1Ba405ce",	
                    "0xe4e156167cc9C7AC4AbD8d39d203a5495F775547",//xy
                ]
            }
        }],


        ["Aurora",{
            wToken:"0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB",
            v2:{
                mos:"0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000000000000"
                    },
                executors:[	
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0x2CB45Edb4517d5947aFdE3BEAbF95A582506858B",//trisolaris 
                    "0xa3a1eF5Ae6561572023363862e238aFA84C72ef5", //wanna
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                ]
            },
            plus:{
                mos:"0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000000000000"
                    },
                executors:[	
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                    "0x2CB45Edb4517d5947aFdE3BEAbF95A582506858B",//trisolaris 
                    "0xa3a1eF5Ae6561572023363862e238aFA84C72ef5", //wanna
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                ]
            }
        }],

        ["Okt",{
            wToken:"0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15",
            v2:{
                mos:"0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15",
                fee:{
                    receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate:"7000",//denominator is 1000000
                    fixedFee:"5000000000000000000"
                },
                executors:[
                    "0xc0006Be82337585481044a7d11941c0828FFD2D4", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            },
            plus:{
                mos:"0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15",
                fee:{
                    receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate:"7000",//denominator is 1000000
                    fixedFee:"5000000000000000000"
                },
                executors:[
                    "0xc0006Be82337585481044a7d11941c0828FFD2D4", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            }
        }],

        ["Boba",{
            wToken:"0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
            v2:{
                    mos:"0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
                    fee:{
                    receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate:"7000",//denominator is 1000000
                    fixedFee:"100000000000000000"
                        },
                    executors:[	
                        "0x17C83E2B96ACfb5190d63F5E46d93c107eC0b514",//oolong 
                    ]
            },
            plus:{
                    mos:"0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
                    fee:{
                    receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate:"7000",//denominator is 1000000
                    fixedFee:"100000000000000000"
                        },
                    executors:[	
                        "0x17C83E2B96ACfb5190d63F5E46d93c107eC0b514",//oolong 
                    ]
            }
        }],

        ["Celo",{
            wToken:"0x471EcE3750Da237f93B8E339c536989b8978a438",
            v2:{
                mos:"0x471EcE3750Da237f93B8E339c536989b8978a438",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"300000000000000000000"
                    },
                executors:[	
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve 
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID 
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            },
            plus:{
                mos:"0x471EcE3750Da237f93B8E339c536989b8978a438",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"300000000000000000000"
                    },
                executors:[	
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve  
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            }
        }],

        ["Cronos",{
            wToken:"0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23",
            v2:{
                mos:"0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"2000000000000000000000"
                    },
                executors:[
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x6c3A0E2E78848274B7E3346b8Ef8a4cBB2fEE2a9",//cro-swap  
                    "0xeC0A7a0C2439E8Cb67b992b12ecd020Ea943c7Be",//crodex
                    "0xcd7d16fb918511bf7269ec4f48d61d79fb26f918",//crona-swap
                    "0xF103b5B479d2A629F422C42bb35E7eEceE1ad55E",//xy
                ]
            },
            plus:{
                mos:"0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"2000000000000000000000"
                    },
                executors:[	
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x6c3A0E2E78848274B7E3346b8Ef8a4cBB2fEE2a9",//cro-swap  
                    "0xeC0A7a0C2439E8Cb67b992b12ecd020Ea943c7Be",//crodex
                    "0xcd7d16fb918511bf7269ec4f48d61d79fb26f918",//crona-swap
                    "0xF103b5B479d2A629F422C42bb35E7eEceE1ad55E",//xy
                ]
            }
        }],

        ["Ethw",{
            wToken:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            v2:{
                mos:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"70000000000000000000"
                    },
                executors:[	
                    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",//sushi 
                    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",//univ2 
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564",//univ3 
                ]
            },
            plus:{
                mos:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"70000000000000000000"
                    },
                executors:[	
                    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",//sushi 
                    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",//univ2 
                    "0xE592427A0AEce92De3Edee1F18E0157C05861564",//univ3 
                ]
            }
        }],

        ["Fantom",{
            wToken:"0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
            v2:{
                mos:"0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"500000000000000000000"
                    },
                executors:[	
                    "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6",//stargate
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve 
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch 
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0x6b3d631B87FE27aF29efeC61d2ab8CE4d621cCBF",//soul 
                    "0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52",//spirit  
                    "0xF491e7B69E4244ad4002BC14e878a34207E38c29",//spooky
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0xDa241399697fa3F6cD496EdAFab6191498Ec37F5",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            },
            plus:{
                mos:"0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"500000000000000000000"
                    },
                executors:[	
                    "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6",//stargate
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve 
                    "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch 
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0x6b3d631B87FE27aF29efeC61d2ab8CE4d621cCBF",//soul 
                    "0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52",//spirit  
                    "0xF491e7B69E4244ad4002BC14e878a34207E38c29",//spooky
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0xDa241399697fa3F6cD496EdAFab6191498Ec37F5",//xy
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            }
        }],

        ["Gnosis",{
            wToken:"0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
            v2:{
                mos:"0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"150000000000000000000"
                    },
                executors:[	
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0x1C232F01118CB8B424793ae03F870aa7D0ac7f77",//Honeyswap
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            },
            plus:{
                mos:"0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"150000000000000000000"
                    },
                executors:[	
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0x1C232F01118CB8B424793ae03F870aa7D0ac7f77",//Honeyswap
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            }
        }],


        ["Harmony",{
            wToken:"0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a",
            v2:{
                mos:"0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"10000000000000000000000"
                    },
                executors:[	
                    "0x24ad62502d1C652Cc7684081169D04896aC20f30",//trader 
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0xf012702a5f0e54015362cBCA26a26fc90AA832a3",//viper
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            },
            plus:{
                mos:"0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"10000000000000000000000"
                    },
                executors:[	
                    "0x24ad62502d1C652Cc7684081169D04896aC20f30",//trader 
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0xf012702a5f0e54015362cBCA26a26fc90AA832a3",//viper
                    "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", // openocean
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            }
        }],

        ["Kava",{
            wToken:"0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b",
            v2:{
                mos:"0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"150000000000000000000"
                    },
                executors:[	
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve 
                    "0x7a2c1D96C76B6EB62241df4d2fAEb9F0D3D59E10",//elk  
                    "0xEa3CB4Ba9d1fD6fb19Df1380958d5649bD3e7C50",//jupiter 
                    "0x8a340F39A468C2FcBFFf2122446a9A0745A313Ad",//photon 
                    "0x4310ed61E7E4fd50C2b44C92725C087abeB632a2",//surfdex 
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID            
                ]
            },
            plus:{
                mos:"0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"150000000000000000000"
                    },
                executors:[
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve 
                    "0x7a2c1D96C76B6EB62241df4d2fAEb9F0D3D59E10",//elk  
                    "0xEa3CB4Ba9d1fD6fb19Df1380958d5649bD3e7C50",//jupiter 
                    "0x8a340F39A468C2FcBFFf2122446a9A0745A313Ad",//photon 
                    "0x4310ed61E7E4fd50C2b44C92725C087abeB632a2",//surfdex 
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID  
                ]
            }
        }],

        ["Klaytn",{
            wToken:"0x19aac5f612f524b754ca7e7c41cbfa2e981a4432",
            v2:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"1000",//denominator is 1000000
                fixedFee:"10000000000000000000"
                    },
                executors:[
                    "0xEf71750C100f7918d6Ded239Ff1CF09E81dEA92D",//claimswap
                    "0x52075Fd1fF67f03beABCb5AcdA9679b02d98cA37",//xy
                    "0xe0fbB27D0E7F3a397A67a9d4864D4f4DD7cF8cB9", // klayswap
                ]
            },
            plus:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000000"
                    },
                executors:[	
                    "0xEf71750C100f7918d6Ded239Ff1CF09E81dEA92D",//claimswap
                    "0x52075Fd1fF67f03beABCb5AcdA9679b02d98cA37",//xy
                    "0xe0fbB27D0E7F3a397A67a9d4864D4f4DD7cF8cB9", // klayswap
                ]
            }
        }],

        ["Metis",{
            wToken:"0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
            v2:{
                mos:"0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"7000000000000000000"
                    },
                executors:[	
                    "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",//stargate
                    "0x1E876cCe41B7b844FDe09E38Fa1cf00f213bFf56",//net-swap 
                ]
            },
            plus:{
                mos:"0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"7000000000000000000"
                    },
                executors:[	
                    "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",//stargate
                    "0x1E876cCe41B7b844FDe09E38Fa1cf00f213bFf56",//net-swap 
                ]
            }
        }],

        ["Moonbeam",{
            wToken:"0xAcc15dC74880C9944775448304B263D191c6077F",
            v2:{
                mos:"0xAcc15dC74880C9944775448304B263D191c6077F",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"600000000000000000000"
                    },
                executors:[	
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve 
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                     
                ]
            },
            plus:{
                mos:"0xAcc15dC74880C9944775448304B263D191c6077F",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"600000000000000000000"
                    },
                executors:[	
                    "0x0000000022D53366457F9d5E68Ec105046FC4383",//curve  
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//squid
                ]
            }
        }],

        ["Moonriver",{
            wToken:"0xf50225a84382c74CbdeA10b0c176f71fc3DE0C4d",
            v2:{
                mos:"0xf50225a84382c74CbdeA10b0c176f71fc3DE0C4d",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"30000000000000000000"
                    },
                executors:[	
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi   
                    "0xAA30eF758139ae4a7f798112902Bf6d65612045f",//solarbeam  
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi 
                    "0xc67Dd7054915a2B0aA3e48f35DA714Ff861e71BD",//xy
                ]
            },
            plus:{
                mos:"0xf50225a84382c74CbdeA10b0c176f71fc3DE0C4d",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"30000000000000000000"
                    },
                executors:[	
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi   
                    "0xAA30eF758139ae4a7f798112902Bf6d65612045f",//solarbeam  
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi 
                    "0xc67Dd7054915a2B0aA3e48f35DA714Ff861e71BD",//xy
                ]
            }
        }],

        
        ["Oasis",{
            wToken:"0x21C718C22D52d0F3a789b752D4c2fD5908a8A733",
            v2:{
                mos:"0x21C718C22D52d0F3a789b752D4c2fD5908a8A733",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"3000000000000000000000"
                    },
                executors:[	
                    "0x250d48C5E78f1E85F7AB07FEC61E93ba703aE668",//yuzu-swap   
                ]
            },
            plus:{
                mos:"0x21C718C22D52d0F3a789b752D4c2fD5908a8A733",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"3000000000000000000000"
                    },
                executors:[	
                    "0x250d48C5E78f1E85F7AB07FEC61E93ba703aE668",//yuzu-swap   
                ]
            }
        }],

        ["Syscoin",{
            wToken:"0xd3e822f3ef011ca5f17d82c956d952d8d7c3a1bb",
            v2:{
                mos:"0xd3e822f3ef011ca5f17d82c956d952d8d7c3a1bb",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000000"
                    },
                executors:[	
                    "0x017dAd2578372CAEE5c6CddfE35eEDB3728544C4",//pegasys    
                ]
            },
            plus:{
                mos:"0xd3e822f3ef011ca5f17d82c956d952d8d7c3a1bb",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000000"
                    },
                executors:[	
                    "0x017dAd2578372CAEE5c6CddfE35eEDB3728544C4",//pegasys    
                ]
            }
        }],

        ["Telos",{
            wToken:"0xD102cE6A4dB07D247fcc28F366A623Df0938CA9E",
            v2:{
                mos:"0xD102cE6A4dB07D247fcc28F366A623Df0938CA9E",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000000"
                    },
                executors:[	
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0xb9667cf9a495a123b0c43b924f6c2244f42817be",//ape-swap    
                    "0xF9678db1CE83f6f51E5df348E2Cc842Ca51EfEc1",//omnidex	
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0xb9239af0697c8efb42cba3568424b06753c6da71",//zappy 
                ]
            },
            plus:{
                mos:"0xD102cE6A4dB07D247fcc28F366A623Df0938CA9E",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000000"
                    },
                executors:[	
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0xb9667cf9a495a123b0c43b924f6c2244f42817be",//ape-swap    
                    "0xF9678db1CE83f6f51E5df348E2Cc842Ca51EfEc1",//omnidex	
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                    "0xb9239af0697c8efb42cba3568424b06753c6da71",//zappy 
                ]
            }
        }],

        ["Velas",{
            wToken:"0xc579D1f3CF86749E05CD06f7ADe17856c2CE3126",
            v2:{
                mos:"0xc579D1f3CF86749E05CD06f7ADe17856c2CE3126",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"10000000000000000000000"
                    },
                executors:[	
                    "0x3328cd3a9A295cd00fBb1d71Bf097e002B4614ad",//astro     
                    "0x3D1c58B6d4501E34DF37Cf0f664A58059a188F00",//wagyu 	
                ]
            },
            plus:{
                mos:"0xc579D1f3CF86749E05CD06f7ADe17856c2CE3126",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"10000000000000000000000"
                    },
                executors:[	
                    "0x3328cd3a9A295cd00fBb1d71Bf097e002B4614ad",//astro     
                    "0x3D1c58B6d4501E34DF37Cf0f664A58059a188F00",//wagyu 	
                ]
            }
        }],

        ["Astar",{
            wToken:"0xaeaaf0e2c81af264101b9129c00f4440ccf0f720",
            v2:{
                mos:"0xaeaaf0e2c81af264101b9129c00f4440ccf0f720",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"3000000000000000000000"
                    },
                executors:[  
                "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                 "0xE915D2393a08a00c5A463053edD31bAe2199b9e7",//arts-swap
                 "0x5C6C12Fd8b1f7E60E5B60512712cFbE0192E795E", //xy 
                ]
            },
            plus:{
                mos:"0xaeaaf0e2c81af264101b9129c00f4440ccf0f720",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"3000000000000000000000"
                    },
                executors:[  
                "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                 "0xE915D2393a08a00c5A463053edD31bAe2199b9e7",//arts-swap
                 "0x5C6C12Fd8b1f7E60E5B60512712cFbE0192E795E", //xy 
                ]
            }
        }],

        ["Map",{
            wToken:"0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23",
            v2:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"10000000000000000000000"
                    },
                executors:[
                "0x0bce9e0ebd4fd4d6562495af45c4aaa0c1f7f3d7",//hiveswap
                ]
            },
            plus:{
                mos:"0xfeB2b97e4Efce787c08086dC16Ab69E063911380",
                fee:{
                receiver:"0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"10000000000000000000000"
                    },
                executors:[
                "0x0bce9e0ebd4fd4d6562495af45c4aaa0c1f7f3d7",//hiveswap
                ]
            }
        }],
        ["Fuse",{
            wToken:"0x0BE9e53fd7EDaC9F859882AfdDa116645287C629",
            v2: {
                mos: "0x0BE9e53fd7EDaC9F859882AfdDa116645287C629",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushiswap
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            },
            plus: {
                mos: "0x0BE9e53fd7EDaC9F859882AfdDa116645287C629",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushiswap
                    "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",// lifi
                ]
            }
        }],

        ["zkEvm",{
            wToken:"0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9",
            v2: {
                mos: "0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x3689D3B912d4D73FfcAad3a80861e7caF2d4F049",//xy
                ]
            },
            plus: {
                mos: "0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x3335733c454805df6a77f825f266e136FB4a3333",//rubic
                    "0x3689D3B912d4D73FfcAad3a80861e7caF2d4F049",//xy
                ]
            }
        }],

        ["Linea",{
            wToken:"0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f",
            v2: {
                mos: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x73Ce60416035B8D7019f6399778c14ccf5C9c7A1",//xy router
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID
                ]
            },
            plus: {
                mos: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x73Ce60416035B8D7019f6399778c14ccf5C9c7A1",//xy router
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID
                ]
            }
        }],

        ["Base",{
            wToken:"0x4200000000000000000000000000000000000006",
            v2: {
                mos: "0x4200000000000000000000000000000000000006",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID
                ]
            },
            plus: {
                mos: "0x4200000000000000000000000000000000000006",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID
                ]
            }
        }],

        ["Filecoin",{
            wToken:"0xA35Bf7ef23B09fb099e6e75A078727dFf14b7576",
            v2: {
                mos: "0xA35Bf7ef23B09fb099e6e75A078727dFf14b7576",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID
                ]
            },
            plus: {
                mos: "0xA35Bf7ef23B09fb099e6e75A078727dFf14b7576",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0xce16F69375520ab01377ce7B88f5BA8C48F8D666",//SQUID
                ]
            }
        }],

        ["Kcc",{
            wToken:"0x4446fc4eb47f2f6586f9faab68b3498f86c07521",
            v2: {
                mos: "0x4446fc4eb47f2f6586f9faab68b3498f86c07521",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x7e803b54295Cd113Bf48E7f069f0531575DA1139",//xy router
                ]
            },
            plus: {
                mos: "0x4446fc4eb47f2f6586f9faab68b3498f86c07521",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x7e803b54295Cd113Bf48E7f069f0531575DA1139",//xy router
                ]
            }
        }],

        ["Numbers",{
            wToken:"0xd0c119a5ea32d3bf0a86b30d8ce08a792971f75b",
            v2: {
                mos: "0xd0c119a5ea32d3bf0a86b30d8ce08a792971f75b",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushiswap
                ]
            },
            plus: {
                mos: "0xd0c119a5ea32d3bf0a86b30d8ce08a792971f75b",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushiswap
                ]
            }
        }],

        ["Thunder",{
            wToken:"0x413cefea29f2d07b8f2acfa69d92466b9535f717",
            v2: {
                mos: "0x413cefea29f2d07b8f2acfa69d92466b9535f717",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0xF103b5B479d2A629F422C42bb35E7eEceE1ad55E",//xy router
                ]
            },
            plus: {
                mos: "0x413cefea29f2d07b8f2acfa69d92466b9535f717",
                fee: {
                    receiver: "0x4A53841B9b16182f996a65aAb407e7622CBCf966",
                    feeRate: "7000",//denominator is 1000000
                    fixedFee: "1000000000000000000000"
                },
                executors: [
                    "0xF103b5B479d2A629F422C42bb35E7eEceE1ad55E",//xy router
                ]
            }
        }],
        


        //<------------------------------------- test ----------------------------------------->

        ["BscTest",{
            wToken:"0xae13d989dac2f0debff460ac112a837c89baa7cd",
            v2:{
                mos:"0x3C12F82ea96c855944efe9f3aC4ce18449Aa634B",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000"
                    },
                executors:[
                    "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",	
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x6710b000cc6728e068C095B66535E1A8b552e816"
                ]
            },
            plus:{
                mos:"0x3C12F82ea96c855944efe9f3aC4ce18449Aa634B",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000"
                    },
                executors:[
                    "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",	
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x6710b000cc6728e068C095B66535E1A8b552e816"
                ]
            }
        }],

        ["Makalu",{
            wToken:"0x2eD27dF9B4c903aB53666CcA59AFB431F7D15e91",
            v2:{
                mos:"0x3D8da6f43e35E05162d874BdaF93f61995A34D81",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000"
                    },
                executors:[
                    "0xf479BD49E55cf47474056Ef168B0E0709DDF1830"
                ]
            },
            plus:{
                mos:"0x3D8da6f43e35E05162d874BdaF93f61995A34D81",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000"
                    },
                executors:[
                    "0xf479BD49E55cf47474056Ef168B0E0709DDF1830"
                ]
            }
        }],

        ["Goerli",{
            wToken:"0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
            v2:{
                mos:"0xe03573615eF3bff296C09A93DCD4409981f82540",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000"
                    },
                executors:[
                    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
                    "0xa064aa3f10de46cb114e543a9f8d90770cfb0d7c"
                ]
            },
            plus:{
                mos:"0xe03573615eF3bff296C09A93DCD4409981f82540",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"100000000"
                    },
                executors:[
                    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
                    "0xa064aa3f10de46cb114e543a9f8d90770cfb0d7c"
                ]
            }
        }],

        ["MaticTest",{
            wToken:"0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
            v2:{
                mos:"0x71f38FE43031397C102F10fb857a6D432af10642",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000"
                    },
                executors:[
                    "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
                    "0x15e6c86a9ac9a32f91125794fda82eeb807ed818"
                ]
            },
            plus:{
                mos:"0x71f38FE43031397C102F10fb857a6D432af10642",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000"
                    },
                executors:[
                    "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
                    "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
                    "0x15e6c86a9ac9a32f91125794fda82eeb807ed818"
                ]
            }
        }],

        ["zkSyncTest",{
            wToken:"0x20b28B1e4665FFf290650586ad76E977EAb90c5D",
            v2:{
                mos:"0x20b28B1e4665FFf290650586ad76E977EAb90c5D",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000"
                    },
                executors:[
                    "0x3dBe031355BDdECD4D70673A80b708a73D157814"
                ]
            },
            plus:{
                mos:"0x20b28B1e4665FFf290650586ad76E977EAb90c5D",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000"
                    },
                executors:[
                    "0x3dBe031355BDdECD4D70673A80b708a73D157814"
                ]
            }
        }],
        ["TronTest",{
            wToken:"0xFB3B3134F13CCD2C81F4012E53024E8135D58FEE",
            v2:{
                mos:"0xFB3B3134F13CCD2C81F4012E53024E8135D58FEE",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000"
                    },
                executors:[
                    "0xFB3B3134F13CCD2C81F4012E53024E8135D58FEE"
                ]
            },
            plus:{
                mos:"0xFB3B3134F13CCD2C81F4012E53024E8135D58FEE",
                fee:{
                receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
                feeRate:"7000",//denominator is 1000000
                fixedFee:"1000000000000000000"
                    },
                executors:[
                    "0xFB3B3134F13CCD2C81F4012E53024E8135D58FEE"
                ]
            }
        }],
        
    ]
)

exports.getConfig =function(network) {
    return config.get(network);
}  