// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//Reference https://github.com/butternetwork/butter-mos-contracts/blob/master/evmv2/contracts/interface/IButterMosV2.sol
interface IButterMos {

    struct SwapParam {
        uint256 amountIn;
        uint256 minAmountOut;
        bytes path; //evm, or tokenIn'X'tokenOut on near
        uint64 routerIndex; // pool id on near or router index on evm
    }

    struct SwapData {
        SwapParam[] swapParams;
        bytes targetToken;
        address mapTargetToken;
    }

    function swapOutToken(
        address _initiatorAddress,
        address _token, // src token
        bytes memory _to,
        uint256 _amount,
        uint256 _toChain, // target chain id
        bytes calldata swapData
    ) external returns(bytes32 orderId);


    function swapOutNative(
        address _initiatorAddress,
        bytes memory _to,
        uint256 _toChain, // target chain id
        bytes calldata swapData
    ) external payable returns(bytes32 orderId);

}