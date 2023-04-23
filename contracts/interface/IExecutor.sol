// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IExecutor {
    enum DexType {
        AGG,
        UNIV2,
        UNIV3,
        CURVE
    }

    function execute(
        uint8 _dexType,
        address _router,
        address _dstToken,
        uint256 _amount,
        bool _isNative,
        bytes memory _swap
    ) external;
}
