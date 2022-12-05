
const { baToJSON } = require("@nomicfoundation/ethereumjs-util");
const {expect} = require("chai");
const exp = require("constants");
const { sync } = require("glob");
const {ethers,network} = require("hardhat");
const { any } = require("hardhat/internal/core/params/argumentTypes");




//// fork mainnet

describe("ButterRouterV2",function(){   
    let WHALE = '0x5096007EA5939A0948Bd89d9a48bccF8A94218e5';
    let WBNB = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';
    let BUSD = '0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7';
    let ButterswapRouter;
    let owenr;
    let ButterRouter; 
    let addre1;
    let addre2; 
    let index = 0;
    let addrePancake;
    let whale;
    let busd;
    let wbnb;
    // let ButterSwap;


    beforeEach(async()=>{
        await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [WHALE]})    
        whale =  await ethers.getSigner(WHALE);

        wbnb = await ethers.getContractAt("IERC20",WBNB);
        busd = await ethers.getContractAt("IERC20",BUSD);


        ButterswapRouter = await ethers.getContractFactory("ButterRouterV2");
        ButterRouter = await ButterswapRouter.deploy();
        ButterSwap = ButterRouter.address;
        console.log("ButterswapRouter address:",ButterRouter.address);

    });
     

    
    // ERC20-ERC20
    it("SwapOutTokne",async ()=>{

    let _amountInArrs = 100n * 10n ** 18n;
        console.log(_amountInArrs);

      let  _amountInArr = [_amountInArrs];

      let _paramsArr = ['0x0000000000000000000000000000000000000000000000056bc75e2d63100000000000000000000000000000000000000000000000000000000000000002ea1700000000000000000000000000000000000000000000000000000000000000e00000000000000000000000001d7a59f706a7d00a0fc221011abec9253b0614240000000000000000000000000000000000000000000000000000000063abe5c700000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7000000000000000000000000ae13d989dac2f0debff460ac112a837c89baa7cd000000000000000000000000000000000000000000000000000000000000000200000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7000000000000000000000000ae13d989dac2f0debff460ac112a837c89baa7cd'];

      let _routerIndex = ['0'];

      let _inputOutAddre = ['0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7','0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'];

      let _amount = _amountInArrs;

    let swapData = {
        amountInArr:_amountInArr,
        paramsArr:_paramsArr,
        routerIndex:_routerIndex,
        inputOutAddre:_inputOutAddre
    }

    console.log(swapData);

    // let newAmountIns = 100n * 10n ** 18n;
    let newAmountIns = "100000000000000000000";
    // let newMinAmountOuts =10n * 10n ** 18n;

    let newPaths = '0x00000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7000000000000000000000000000000000000000000000002b5e3af16b1880000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000028000000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7000000000000000000000000ae13d989dac2f0debff460ac112a837c89baa7cd0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000002b5e3af16b1880000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000002b5e3af16b1880000000000000000000000000000000000000000000000000000000000000002ea1700000000000000000000000000000000000000000000000000000000000000e000000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a70000000000000000000000000000000000000000000000000000000063abe5c700000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7000000000000000000000000ae13d989dac2f0debff460ac112a837c89baa7cd000000000000000000000000000000000000000000000000000000000000000200000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7000000000000000000000000ae13d989dac2f0debff460ac112a837c89baa7cd00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000';

    let newRouterIndexs= '0';

    let newTargetToken = '0x00000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7';

    let newtoAddress = '0x00000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7';

    let newSwapParam = [{
        amountIn: newAmountIns,
        minAmountOut:newAmountIns,
        path:newPaths, // 0xtokenin+0xtokenOut on evm, or tokenIn'X'tokenOut on near
        routerIndex:newRouterIndexs,// pool id on near or router index on evm
    }]
    
    let SwapData = {
        swapParams:newSwapParam,
        targetToken:newTargetToken,
        toAddress:newtoAddress
    }

    let mapTargetToken = "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7";

    let toChain = 212;

    let amounts = "100000000000000000000";

        let bal_busd =  await busd.balanceOf(whale.address);
        console.log("busd_balan:",bal_busd);

        let bal_WBN = await wbnb.balanceOf(whale.address);
        console.log("wbnb_balan",bal_WBN);

        await busd.connect(whale).approve(ButterRouter.address,_amountInArrs);
        console.log("approve");

        // console.log(exchangeData);
        await ButterRouter.connect(whale).entrance(swapData,SwapData,amounts,mapTargetToken,toChain);
        console.log("-------------11111-----------------");

        // let wbnb_balan1 =  await wbnb.balanceOf(ButterRouter.address);
        // console.log("ButterRouter:",wbnb_balan1); 

        // let bal_busd1 =  await busd.balanceOf(whale.address);
        // console.log("usdc_balan1:",bal_busd1); 
    })


    //  // ETH-WEC20
    // it("SwapEthToTokne",async ()=>{


    //     let _amountInArrs = 1n * 10n ** 18n;
    //     console.log(_amountInArrs);

    //   let  _amountInArr = [_amountInArrs];

    //   let _paramsArr = ['0x0000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000002ea1700000000000000000000000000000000000000000000000000000000000000e00000000000000000000000001d7a59f706a7d00a0fc221011abec9253b0614240000000000000000000000000000000000000000000000000000000063abe5c7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a70000000000000000000000000000000000000000000000000000000000000002000000000000000000000000ae13d989dac2f0debff460ac112a837c89baa7cd00000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7'];

    //   let _routerIndex = ['0'];

    //   let _inputOutAddre = ['0x0000000000000000000000000000000000000000','0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7'];

    //   let _amount = _amountInArrs;

    //   let exchangeData = {
    //     amountInArr:_amountInArr,
    //     paramsArr:_paramsArr,
    //     routerIndex:_routerIndex,
    //     inputOutAddre:_inputOutAddre,
    //     amount:_amount
    // }

       
    //     console.log("BNB token:",await ethers.provider.getBalance(whale.address));

    //     let bal_busd =  await busd.balanceOf(ButterRouter.address);
    //     console.log("ButterRouter_balan:",bal_busd);


    //     await ButterRouter.connect(whale).entrance(exchangeData,{value:_amountInArrs});
    //     console.log("-------------11111-----------------");

    //     let busd_bal =  await busd.balanceOf(ButterRouter.address);
    //     console.log("ButterRouter_balan:",busd_bal); 

    //     console.log("BNB token:",await ethers.provider.getBalance(whale.address));
    // })


    //  ERC20-ETH
    // it("SwapOutTokneToEth",async ()=>{

    // let _amountInArrs = 100n * 10n ** 18n;
    //     console.log(_amountInArrs);

    //   let  _amountInArr = [_amountInArrs];

    //   let _paramsArr = ['0x0000000000000000000000000000000000000000000000056bc75e2d63100000000000000000000000000000000000000000000000000000000000000002ea1700000000000000000000000000000000000000000000000000000000000000e00000000000000000000000001d7a59f706a7d00a0fc221011abec9253b0614240000000000000000000000000000000000000000000000000000000063abe5c700000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000078867bbeef44f2326bf8ddd1941a4439382ef2a7000000000000000000000000ae13d989dac2f0debff460ac112a837c89baa7cd'];

    //   let _routerIndex = ['0'];
                             
    //   let _inputOutAddre = ['0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7','0x0000000000000000000000000000000000000000'];

    //   let _amount = _amountInArrs;


    // let exchangeData = {
    //     amountInArr:_amountInArr,
    //     paramsArr:_paramsArr,
    //     routerIndex:_routerIndex,
    //     inputOutAddre:_inputOutAddre,
    //     amount:_amount
    // }


    //     let bal_busd =  await busd.balanceOf(whale.address);
    //     console.log("busd_balan:",bal_busd);

    //     console.log("ButterRouter BNB token:",await ethers.provider.getBalance(ButterRouter.address));

    //     await busd.connect(whale).approve(ButterRouter.address,_amount);
    //     console.log("approve");


    //     await ButterRouter.connect(whale).entrance(exchangeData);
    //     console.log("-------------11111-----------------");

    //     console.log("ButterRouter BNB token",await ethers.provider.getBalance(ButterRouter.address));

    //     let bal_busd1 =  await busd.balanceOf(whale.address);
    //     console.log("usdc_balan1:",bal_busd1); 
    // })
    

  
})