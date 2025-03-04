// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interface/IRelayExecutor.sol";
import "../interface/IFlash_Swap.sol";


contract ButterAffiliateFeeExecutor is
    Initializable,
    UUPSUpgradeable,
    AccessControlEnumerable,
    IRelayExecutor
{
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant RETRY_ROLE = keccak256("RETRY_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    uint256 public constant DENOMINATOR = 100000;

    using SafeERC20 for IERC20;

    uint256 public maxAffiliateFee;
    IFlash_Swap public swap;
    address public relay;
    uint16 public currentRegisterId;
    struct AffiliateInfo {
        address receiver;
        uint256 max;
        uint256 min;
    }

    mapping (uint16 => AffiliateInfo) public affiliates;

    error INVALID_MAX_VALUE();
    error ZERO_ADDRESS();
    error AFFILIATE_NOT_EXIST();
    error ONLY_RELAY();
    error RECEIVE_TOO_LOW();
    error FEE_BIG_THAN_IN_AMOUNT();
    event SetMaxAffiliateFee(uint256 _maxAffiliateFee);
    event SetFlashSwapAndRelay(address _swap, address _relay);
    event Register(uint16 id, address _receiver, uint256 _max, uint256 _min);
    event Update(uint16 id, address _receiver, uint256 _max, uint256 _min);
    event CollectAffiliateFee(bytes32 orderId, address token, uint16 affiliateId, address receiver, uint256 fee);
    event RelayExecute(bytes32 _orderId, address _inToken, uint256 _inAmount, address _outToken, uint256 _outAmount);

    constructor() {
         _disableInitializers(); 
    }

    function initialize(address _admin) external initializer {
        if(_admin == address(0)) revert ZERO_ADDRESS();
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(RETRY_ROLE, _admin);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function setFlashSwapAndRelay(address _swap, address _relay) external onlyRole(MANAGER_ROLE) {
        if(_swap == address(0) || _relay == address(0)) revert ZERO_ADDRESS();
        swap = IFlash_Swap(_swap);
        relay = _relay;
        emit SetFlashSwapAndRelay(_swap, _relay);
    }

    function setMaxAffiliateFee(uint256 _maxAffiliateFee) external onlyRole(MANAGER_ROLE) {
        maxAffiliateFee = _maxAffiliateFee;
        emit SetMaxAffiliateFee(_maxAffiliateFee);
    }

    function register(address _receiver, uint256 _max, uint256 _min) external onlyRole(MANAGER_ROLE) {
        require(_max >= _min);
        if(_receiver == address(0)) revert ZERO_ADDRESS();
        if(_max > maxAffiliateFee) revert INVALID_MAX_VALUE();
        affiliates[++currentRegisterId] = AffiliateInfo({
            receiver: _receiver,
            max: _max,
            min: _min
        });
        emit Register(currentRegisterId, _receiver, _max, _min);
    }

    function update(uint16 _id, address _receiver, uint256 _max, uint256 _min) external onlyRole(MANAGER_ROLE) {
        require(_max >= _min);
        if(_receiver == address(0)) revert ZERO_ADDRESS();
        if(_max > maxAffiliateFee) revert INVALID_MAX_VALUE();
        AffiliateInfo storage info = affiliates[_id];
        if(info.receiver == address(0)) revert AFFILIATE_NOT_EXIST();
        info.receiver = _receiver;
        info.max = _max;
        info.min = _min;
        emit Update(_id, _receiver, _max, _min);
    }

    function getAffiliatesFee(uint256 _amount, bytes calldata _affiliatesFee) external view returns(uint256 totalFee) {
        uint256 offset;
        uint256 len = uint256(uint8(bytes1(_affiliatesFee[offset:1])));
        offset += 1;
        if(len == 0) return totalFee;
        for (uint256 i = 0; i < len; i++) {
            uint16 id = uint16(bytes2(_affiliatesFee[offset: (offset + 2)]));
            offset += 2;
            uint16 rate = uint16(bytes2(_affiliatesFee[offset: (offset + 2)]));
            offset += 2;
            (, uint256 fee) = _getAffiliateFee(_amount, id, rate);
            if(fee != 0){
                totalFee += fee;
            }
        }
        if(totalFee > _amount) totalFee = _amount;
    }


    function relayExecute(
        uint256 ,
        uint256 ,
        bytes32 _orderId,
        address _token,
        uint256 _amount,
        address ,
        bytes calldata ,
        bytes calldata _message,
        bytes calldata _retryMessage
    )
        external
        payable
        override
        returns (
            address tokenOut,
            uint256 amountOut,
            bytes memory target,
            bytes memory newMessage
        )
    {
      if(msg.sender != relay) revert ONLY_RELAY();
      _checkReceive(_token, _amount);
      if(_retryMessage.length != 0){
        (tokenOut, amountOut, target, newMessage) = _exeute(_orderId, _token, _amount, _retryMessage);
      } else {
        (tokenOut, amountOut, target, newMessage) = _exeute(_orderId, _token, _amount, _message);
      }
      emit RelayExecute(_orderId, _token, _amount, tokenOut, amountOut);
    }


    // _message -> 
    // 1bytes affiliate length n 
    // affiliates n * (2 byte affiliateId + 2 byte fee rate)
    // 1 byte swap (1 - need swap | 0);
    // need swap -> abi.encode(tokenOut, minOut, target, newMessage)
    // no swap => abi.encode(target, swapData)
    function _exeute(
        bytes32 _orderId,
        address _token,
        uint256 _amount,
        bytes calldata _message
    ) internal 
      returns (
            address tokenOut,
            uint256 amountOut,
            bytes memory target,
            bytes memory newMessage
      ) {
        uint256 offset;
        uint256 len = uint256(uint8(bytes1(_message[offset:1])));
        offset += 1;
        if(len != 0){
            _amount = _collectAffiliateFee(_orderId, _token, _amount, _message[offset: (offset + len * 4)], len);
            offset += len * 4;
        } 
        uint8 needSwap = uint8(bytes1(_message[offset:(offset + 1)]));
        offset += 1;
        if(needSwap != 0){
            uint256 minOut;
            (tokenOut, minOut, target, newMessage) = abi.decode(_message[offset:], (address,uint256,bytes,bytes));
            IERC20(_token).forceApprove(address(swap), _amount);
            amountOut = swap.swap(_token, tokenOut, _amount, minOut, address(this));
            IERC20(tokenOut).forceApprove(msg.sender, amountOut);
        } else {
            tokenOut = _token;
            amountOut = _amount;
            (target, newMessage) = abi.decode(_message[offset:], (bytes,bytes));
        }
      }

    function _collectAffiliateFee(bytes32 _orderId, address _token, uint256 _amount, bytes calldata _fee, uint256 _len) internal returns(uint256 afterFee){
        uint256 offset;
        uint256 totalFee;
        for (uint256 i = 0; i < _len; i++) {
            uint16 id = uint16(bytes2(_fee[offset: (offset + 2)]));
            offset += 2;
            uint16 rate = uint16(bytes2(_fee[offset: (offset + 2)]));
            offset += 2;
            (address receiver, uint256 fee) = _getAffiliateFee(_amount, id, rate);
            if(fee != 0){
                totalFee += fee;
                if(totalFee > _amount) revert FEE_BIG_THAN_IN_AMOUNT();
                IERC20(_token).safeTransfer(receiver, fee);
                emit CollectAffiliateFee(_orderId, _token, id, receiver, fee);
            }
        }
        afterFee = _amount - totalFee;
    }


    function _getAffiliateFee(uint256 _amount, uint16 _id, uint16 _rate) internal view returns(address receiver, uint256 fee){
        AffiliateInfo memory info = affiliates[_id];
        receiver = info.receiver;
        fee = _amount * _rate / DENOMINATOR;
        if(fee < info.min) fee = info.min;
        if(fee > info.max) fee = info.max;
    }

    function _checkReceive(address _token, uint256 _amount) private view {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if(balance < _amount) revert RECEIVE_TOO_LOW();
    }

    /** UUPS *********************************************************/
    function _authorizeUpgrade(address) internal view override {
        require(hasRole(UPGRADER_ROLE, msg.sender), "only upgrade role");
    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }

}