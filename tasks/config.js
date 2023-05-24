//wToken,mos,and excutors make sure these addresses must be contract;
let config = new Map(
    [
        ["Eth",{
            wToken:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            mos:"0x630105189c7114667a7179Aa57f07647a5f42B7F",
            fee:{
            receiver:"",
            feeRate:"3000",//denominator is 1000000
            fixedFee:"100000000"
                },
            excutors:[]
        }],

        ["Avalanche",{
            wToken:"0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
            mos:"0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
            fee:{
            receiver:"",
            feeRate:"3000",//denominator is 1000000
            fixedFee:"100000000"
                },
            excutors:[
                "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",//joe
                "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch 
                "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",//pangolin 
                "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"//sushi 
            ]
        }],
        
        ["Bsc",{
            wToken:"0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
            mos:"0x630105189c7114667a7179Aa57f07647a5f42B7F",
            fee:{
            receiver:"",
            feeRate:"3000",//denominator is 1000000
            fixedFee:"100000000"
                },
            excutors:[
                "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                "0x10ED43C718714eb63d5aA57B78B54704E256024E",//pancake
                "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
            ]
        }],
        
        ["Matic",{
            wToken:"0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
            mos:"0x630105189c7114667a7179Aa57f07647a5f42B7F",
            fee:{
            receiver:"",
            feeRate:"3000",//denominator is 1000000
            fixedFee:"100000000"
                },
            excutors:[
                "0xAaaCfe8F51B8baA4286ea97ddF145e946d5e7f46",//algebra	
                "0x1111111254eeb25477b68fb85ed929f73a960582",//1inch
                "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",//quick 
                "0xf5b509bB0909a69B1c207E495f687a596C168E12",//quickv3 
                "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",//sushi 
                "0xE592427A0AEce92De3Edee1F18E0157C05861564"//univ3
            ]
        }],

        ["Map",{
            wToken:"",
            mos:"",
            fee:{
            receiver:"",
            feeRate:"3000",//denominator is 1000000
            fixedFee:"100000000"
                },
            excutors:[

            ]
        }],



        //<------------------------------------- test ----------------------------------------->

        ["BscTest",{
            wToken:"0xae13d989dac2f0debff460ac112a837c89baa7cd",
            mos:"0x6858B990A504D7Fc41D0BBB5178c4675518BDA27",
            fee:{
            receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
            feeRate:"3000",//denominator is 1000000
            fixedFee:"100000000"
                },
            excutors:[
                "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",	
                "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
            ]
        }],

        ["Makalu",{
            wToken:"0x2eD27dF9B4c903aB53666CcA59AFB431F7D15e91",
            mos:"0xb4fCfdD492202c91A7eBaf887642F437a07A2664",
            fee:{
            receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
            feeRate:"3000",//denominator is 1000000
            fixedFee:"100000000"
                },
            excutors:[
                "0xf479BD49E55cf47474056Ef168B0E0709DDF1830"
            ]
        }],

        ["Goerli",{
            wToken:"0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
            mos:"0x2e2D0FBF6c69B21a56d49ca3A31fEB8Df923f2FB",
            fee:{
            receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
            feeRate:"3000",//denominator is 1000000
            fixedFee:"100000000"
                },
            excutors:[
                "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
                "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
            ]
        }],

        ["MaticTest",{
            wToken:"0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
            mos:"0x6858B990A504D7Fc41D0BBB5178c4675518BDA27",
            fee:{
            receiver:"0xCBdb1Da4f99276b0c427776BDE93838Bc19386Cc",
            feeRate:"3000",//denominator is 1000000
            fixedFee:"100000000"
                },
            excutors:[
                "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
                "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
            ]
        }],
        
    ]
)

exports.getConfig =function(network) {
    return config.get(network);
}  