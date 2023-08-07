// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./lib/Helper.sol";

contract FeeReceiver is Ownable2Step {
    mapping (address => bool) public converters;
    uint256 private _totalShares;
    address[] private _payees;
    mapping(address => uint256) public shares;
    mapping(address => bool) public stablecoins;
    //0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for native token
    mapping(address => uint256) public totalReleased;
    mapping(address => mapping(address => uint256)) public payeeReleased;

    event PayeeAdded(address account, uint256 shares);
    event AddStablecoin(address indexed stablecoin);
    event PaymentReceived(address from, uint256 amount);
    event EditConverter(address converter,bool flag);
    event ConvertTo(address token,uint256 amount);
    event PaymentReleased(address indexed token, address to, uint256 amount);

    struct Convert {
        address token;
        address callTo;
        address approveTo;
        bytes playload;
    }
    constructor(address[] memory payees, uint256[] memory shares_,address _owner){
        require(payees.length == shares_.length, "payees and shares length mismatch");
        require(payees.length > 0, "no payees");

        for (uint256 i = 0; i < payees.length; i++) {
            _addPayee(payees[i], shares_[i]);
        }
        require(_owner != address(0), "owner can not be zero address");
        _transferOwnership(_owner);
        converters[_owner] = true;
    }

    function convertToStablecoin(Convert[] calldata converts) external {
        require(converters[msg.sender],"convert deny");
        require(converts.length > 0);
        for(uint256 i = 0; i < converts.length; i++){
            require(converts[i].callTo.code.length > 0,"execute must be contract address");
            require(!stablecoins[converts[i].token],"not need convert");
            uint256 balance = Helper._getBalance(converts[i].token,address(this));
            bool result;
            if(Helper._isNative(converts[i].token)){
               (result,) = converts[i].callTo.call{value:balance}(converts[i].playload);
            } else {
                SafeERC20.safeIncreaseAllowance(IERC20(converts[i].token),converts[i].approveTo,balance);
                (result,) = converts[i].callTo.call(converts[i].playload);
            }
            require(result,"convert fail");
            emit ConvertTo(converts[i].token,balance);
        }
    }


    function editConverter(address converter,bool flag) external onlyOwner {
        converters[converter] = flag;
        emit EditConverter(converter,flag);
    }


    function addStablecoins(address stablecoin) external onlyOwner {
        stablecoins[stablecoin] = true;
        emit AddStablecoin(stablecoin);
    }


    function release(address token, address account) public virtual {
        require(shares[account] > 0, "account has no shares");
        require(stablecoins[token],"unsuport release token");
        uint256 payment = releasable(token, account);
        require(payment != 0, "account is not due payment");

        totalReleased[token] += payment;
        unchecked {
            payeeReleased[token][account] += payment;
        }
        Helper._transfer(token,account,payment);
        emit PaymentReleased(token, account, payment);
    }

    function releasable(address token, address account) public view returns (uint256) {
        if(token == address(0)){
            return 0;
        }
        uint256 totalReceived = Helper._getBalance(token,address(this)) + totalReleased[token];
        return _pendingPayment(account, totalReceived, payeeReleased[token][account]);
    }

    function totalShares() public view returns (uint256) {
        return _totalShares;
    }

    function payee(uint256 index) public view returns (address) {
        return _payees[index];
    }

    function _pendingPayment(
        address account,
        uint256 totalReceived,
        uint256 alreadyReleased
    ) private view returns (uint256) {
        return (totalReceived * shares[account]) / _totalShares - alreadyReleased;
    }

    function _addPayee(address account, uint256 shares_) private {
        require(account != address(0), "account is the zero address");
        require(shares_ > 0, "shares are 0");
        require(shares[account] == 0, "account already has shares");

        _payees.push(account);
        shares[account] = shares_;
        _totalShares = _totalShares + shares_;
        emit PayeeAdded(account, shares_);
   }
        
    receive() external payable virtual { }
}