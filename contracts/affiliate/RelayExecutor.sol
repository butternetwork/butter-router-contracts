// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interface/IRelayExecutor.sol";
import "../interface/IFlash_Swap.sol";
import "../interface/IAffiliateFeeManager.sol";

contract RelayExecutor is AccessControlEnumerable, IRelayExecutor {
    bytes32 public constant RETRY_ROLE = keccak256("RETRY_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    using SafeERC20 for IERC20;

    address public relay;
    IFlash_Swap public swap;
    IAffiliateFeeManager public feeManager;

    error ZERO_AMOUNT();
    error ZERO_ADDRESS();
    error ONLY_RELAY();
    error RECEIVE_TOO_LOW();
    error ONLY_RETRY_ROLE();

    event Set(address _swap, address _relay, address _feeManager);
    event RelayExecute(bytes32 orderId, address inToken, uint256 inAmount, address outToken, uint256 outAmount);

    constructor(address _admin) {
        if (_admin == address(0)) revert ZERO_ADDRESS();
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(RETRY_ROLE, _admin);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function set(address _swap, address _relay, address _feeManager) external onlyRole(MANAGER_ROLE) {
        if (_swap == address(0) || _relay == address(0) || _feeManager == address(0)) revert ZERO_ADDRESS();
        relay = _relay;
        swap = IFlash_Swap(_swap);
        feeManager = IAffiliateFeeManager(_feeManager);
        emit Set(_swap, _relay, _feeManager);
    }

    function relayExecute(
        uint256,
        uint256,
        bytes32 _orderId,
        address _token,
        uint256 _amount,
        address _caller,
        bytes calldata,
        bytes calldata _message,
        bytes calldata _retryMessage
    )
        external
        payable
        override
        returns (address tokenOut, uint256 amountOut, bytes memory target, bytes memory newMessage)
    {
        if (msg.sender != relay) revert ONLY_RELAY();
        if (_amount == 0) revert ZERO_AMOUNT();
        _checkReceive(_token, _amount);
        if (_retryMessage.length != 0) {
            if (!hasRole(RETRY_ROLE, _caller)) revert ONLY_RETRY_ROLE();
            (tokenOut, amountOut, target, newMessage) = _execute(_orderId, _token, _amount, _retryMessage);
        } else {
            (tokenOut, amountOut, target, newMessage) = _execute(_orderId, _token, _amount, _message);
        }
        emit RelayExecute(_orderId, _token, _amount, tokenOut, amountOut);
    }

    // _message ->
    // 1bytes affiliate length n
    // affiliates n * (2 byte affiliateId + 2 byte fee rate)
    // 1 byte swap (1 - need swap | 0);
    // need swap -> abi.encode(tokenOut, minOut, target, newMessage)
    // no swap => abi.encode(target, swapData)
    function _execute(
        bytes32 _orderId,
        address _token,
        uint256 _amount,
        bytes calldata _message
    ) internal returns (address tokenOut, uint256 amountOut, bytes memory target, bytes memory newMessage) {
        uint256 offset;
        uint256 len = uint256(uint8(bytes1(_message[offset:(offset += 1)])));
        if (len != 0) {
            try
                feeManager.collectAffiliatesFee(_orderId, _token, _amount, _message[offset:(offset += len * 4)])
            returns (uint256 totalFee) {
                IERC20(_token).safeTransfer(address(feeManager), totalFee);
                _amount -= totalFee;
            } catch (bytes memory) {
                // do nothing
            }
        }
        uint8 needSwap = uint8(bytes1(_message[offset:(offset += 1)]));
        if (needSwap != 0) {
            uint256 minOut;
            (tokenOut, minOut, target, newMessage) = abi.decode(_message[offset:], (address, uint256, bytes, bytes));
            IERC20(_token).forceApprove(address(swap), _amount);
            amountOut = swap.swap(_token, tokenOut, _amount, minOut, address(this));
            _clearAllowance(_token, address(swap));
        } else {
            tokenOut = _token;
            amountOut = _amount;
            (target, newMessage) = abi.decode(_message[offset:], (bytes, bytes));
        }
    }

    function _checkReceive(address _token, uint256 _amount) private view {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance < _amount) revert RECEIVE_TOO_LOW();
    }

    function _clearAllowance(address _token, address _spender) private {
        uint256 allowance = IERC20(_token).allowance(address(this), _spender);
        if (allowance > 0) IERC20(_token).approve(_spender, 0);
    }
}
