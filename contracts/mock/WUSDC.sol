
pragma solidity ^0.8.0;

contract WUSDC {
    string public name = "Wrapped USDC";
    string public symbol = "WUSDC";
    uint8 public decimals = 18;

    event Approval(address indexed src, address indexed guy, uint wad);
    event Transfer(address indexed src, address indexed dst, uint wad);
    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    receive() external payable {
        deposit();
    }
    function deposit() public payable {
        revert("WUSDC is a mock contract and does not accept deposits");
    }
    function withdraw(uint wad) public {
        revert("WUSDC is a mock contract and does not allow withdrawals");
    }

    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    function approve(address guy, uint wad) public returns (bool) {
        revert("WUSDC is a mock contract and does not allow approvals");
    }

    function transfer(address dst, uint wad) public returns (bool) {
        revert("WUSDC is a mock contract and does not allow transfers");
    }

    function transferFrom(address src, address dst, uint wad) public returns (bool) {
        revert("WUSDC is a mock contract and does not allow transfers");
    }
}