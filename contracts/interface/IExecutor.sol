// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IExecutor {
    enum DexType {
        AGG,
        UNIV2,
        UNIV3,
        CURVE
    }
    // DexType
    // the address to execute swap for DexType.UNIV2 router is uniswap v2 router
    // _dstToken swap target Token
    // input token amount 
    // _isNative input whether native token
    // _swap specific data for swap
    function execute(
        uint8 _dexType,
        address _router,
        address _dstToken,
        uint256 _amount,
        bool _isNative,
        bytes memory _swap
    ) external payable;
}
