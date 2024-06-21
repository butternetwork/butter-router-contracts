// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IButterMosV2 {
    function swapOutToken(
        address _sender,
        address _token, // src token
        bytes memory _to,
        uint256 _amount,
        uint256 _toChain, // target chain id
        bytes calldata _swapData
    ) external returns (bytes32 orderId);

    function swapOutNative(
        address _sender,
        bytes memory _to,
        uint256 _toChain, // target chain id
        bytes calldata _swapData
    ) external payable returns (bytes32 orderId);

    function depositToken(address _token, address to, uint256 _amount) external;

    function depositNative(address _to) external payable;

    function getOrderStatus(
        uint256 _chainId,
        uint256 _blockNum,
        bytes32 _orderId
    ) external view returns (bool exists, bool verifiable, uint256 nodeType);

    event mapTransferOut(
        uint256 indexed fromChain,
        uint256 indexed toChain,
        bytes32 orderId,
        bytes token,
        bytes from,
        bytes to,
        uint256 amount,
        bytes toChainToken
    );

    event mapDepositOut(
        uint256 indexed fromChain,
        uint256 indexed toChain,
        bytes32 orderId,
        address token,
        bytes from,
        address to,
        uint256 amount
    );

    event mapSwapOut(
        uint256 indexed fromChain, // from chain
        uint256 indexed toChain, // to chain
        bytes32 orderId, // order id
        bytes token, // token to transfer
        bytes from, // source chain from address
        bytes to,
        uint256 amount,
        bytes swapData // swap data, used on target chain dex.
    );

    event mapSwapIn(
        uint256 indexed fromChain,
        uint256 indexed toChain,
        bytes32 indexed orderId,
        address token,
        bytes from,
        address toAddress,
        uint256 amountOut
    );
}
