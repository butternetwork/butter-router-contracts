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
    bytes32 public constant RETRY_ROLE = keccak256("RETRY_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    uint256 public constant DENOMINATOR = 10000;

    using SafeERC20 for IERC20;

    address public relay;
    IFlash_Swap public swap;
    uint16 public currentRegisterId;
    uint16 public maxAffiliateFeeRate;
    bool public isRegisterNeedWhitelist;

    struct AffiliateInfo {
        uint16 id;
        uint16 baseRate;
        uint16 maxRate;
        address wallet;
        string nickname;
    }

    struct TokenFee {
        address token;
        uint256 feeAmount;
        uint256 outAmount;
    }

    mapping (address => bool) public whitelist;
    mapping (string => uint16) private nicknameToId;
    mapping (address => uint16) private walletToId;
    mapping (uint16 => AffiliateInfo) private affiliateInfos;
    mapping (uint16 => mapping(address => uint256)) private affiliateTokenFees; 


    error INVALID_MAX_VALUE();
    error ZERO_ADDRESS();
    error AFFILIATE_NOT_EXIST();
    error ONLY_RELAY();
    error RECEIVE_TOO_LOW();
    error FEE_BIG_THAN_IN_AMOUNT();
    error ONLY_RETRY_ROLE();
    error WALLET_REGISTERED();
    error NICKNAME_REGISTERED();
    error ONLY_WALLET();
    error EMPTY_TOKENS();
    error ONLY_WHITELIST();
    error ZERO_AMOUNT();

    event Set(uint16 id, uint16 base, uint256 max);
    event UpdateWhitelist(address _user, bool _flag);
    event SetMaxAffiliateFeeRate(uint16 _maxAffiliateFee);
    event Register(uint16 id, address wallet, string nickname);
    event SetFlashSwapAndRelay(address _swap, address _relay);
    event TriggleRegisterWhitelist(bool _isRegisterNeedWhitelist);
    event WithrawFee(uint16 id, address outToken, uint256 totalOutAmount, TokenFee[] fees);
    event RelayExecute(bytes32 orderId, address inToken, uint256 inAmount, address outToken, uint256 outAmount);
    event CollectAffiliateFee(bytes32 orderId, address token, uint256 amount, uint16 affiliateId, uint256 fee, uint16 rate);

    constructor() {
         _disableInitializers(); 
    }

    function initialize(address _admin) external initializer {
        if(_admin == address(0)) revert ZERO_ADDRESS();
        maxAffiliateFeeRate = 3000;
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(RETRY_ROLE, _admin);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function setFlashSwapAndRelay(address _swap, address _relay) external onlyRole(MANAGER_ROLE) {
        if(_swap == address(0) || _relay == address(0)) revert ZERO_ADDRESS();
        relay = _relay;
        swap = IFlash_Swap(_swap);
        emit SetFlashSwapAndRelay(_swap, _relay);
    }

    function setMaxAffiliateFeeRate(uint16 _maxAffiliateFeeRate) external onlyRole(MANAGER_ROLE) {
        maxAffiliateFeeRate = _maxAffiliateFeeRate;
        emit SetMaxAffiliateFeeRate(_maxAffiliateFeeRate);
    }

    function triggleRegisterWhitelist() external onlyRole(MANAGER_ROLE) {
        isRegisterNeedWhitelist = !isRegisterNeedWhitelist;
        emit TriggleRegisterWhitelist(isRegisterNeedWhitelist);
    }

    function updateWhitelist(address _user, bool _flag) external onlyRole(MANAGER_ROLE) {
        whitelist[_user] = _flag;
        emit UpdateWhitelist(_user, _flag);
    }

    function register(string calldata _nickname) external {
        address _wallet = msg.sender;
        if(isRegisterNeedWhitelist){
            if(!whitelist[_wallet]) revert ONLY_WHITELIST();
        }
        if(walletToId[_wallet] != 0) revert WALLET_REGISTERED();
        if(nicknameToId[_nickname] != 0) revert NICKNAME_REGISTERED();
        currentRegisterId ++;
        AffiliateInfo storage info = affiliateInfos[currentRegisterId];
        info.wallet = _wallet;
        info.nickname = _nickname;
        info.id = currentRegisterId;
        walletToId[_wallet] = currentRegisterId;
        nicknameToId[_nickname] = currentRegisterId;
        emit Register(currentRegisterId, _wallet, _nickname);
    }

    function set(uint16 _id, uint16 _base, uint16 _max) external {
        AffiliateInfo storage info = affiliateInfos[_id];
        if(msg.sender != info.wallet) revert ONLY_WALLET();
        require(_max >= _base);
        if(_max > maxAffiliateFeeRate) revert INVALID_MAX_VALUE();
        info.maxRate = _max;
        info.baseRate = _base;
        emit Set(_id, _base, _max);
    }

    function withrawFee(uint16 _id, address[] calldata _tokens, address _outToken) external {
        AffiliateInfo storage info = affiliateInfos[_id];
        if(msg.sender != info.wallet) revert ONLY_WALLET();
        uint256 len = _tokens.length;
        if(len != 0) revert EMPTY_TOKENS();
        TokenFee[] memory fees = new TokenFee[](len);
        uint256 totalOutAmount;
        for (uint256 i = 0; i < len; i++) {
            address token = _tokens[i];
            uint256 amount = affiliateTokenFees[_id][token];
            TokenFee memory fee;
            if(amount == 0){
               fee = TokenFee({
                  token: token,
                  feeAmount: 0,
                  outAmount:0
               });
            } else if(token == _outToken){
                fee = TokenFee({
                  token: token,
                  feeAmount: amount,
                  outAmount: amount
               });
               totalOutAmount += amount;
            } else {
                uint256 outAmount = swap.swap(token, _outToken, amount, 1, address(this));
                fee = TokenFee({
                  token: token,
                  feeAmount: amount,
                  outAmount: outAmount
               });
               totalOutAmount += amount;
            }
            fees[i] = fee;
        }
        IERC20(_outToken).safeTransfer(msg.sender, totalOutAmount);
        emit WithrawFee(_id, _outToken, totalOutAmount, fees);
    }

    function getInfoById(uint16 _id) external view returns(AffiliateInfo memory info) {
        return affiliateInfos[_id];
    }

    function getInfoByWallet(address _wallet) external view returns(AffiliateInfo memory info) {
        return affiliateInfos[walletToId[_wallet]];
    }

    function getInfoByNickname(string calldata _nickname) external view returns(AffiliateInfo memory info) {
        return affiliateInfos[nicknameToId[_nickname]];
    }

    function getTokenFeeInfos(uint16 _id, address[] calldata _tokens, address _outToken) external view returns(uint256 totalOutAmount, TokenFee[] memory fees) {
        uint256 len = _tokens.length;
        fees = new TokenFee[](len);
        for (uint i = 0; i < len; i++) {
           address token = _tokens[i];
            uint256 amount = affiliateTokenFees[_id][token];
            TokenFee memory fee;
            if(amount == 0){
               fee = TokenFee({
                  token: token,
                  feeAmount: 0,
                  outAmount:0
               });
            } else if(token == _outToken){
                fee = TokenFee({
                  token: token,
                  feeAmount: amount,
                  outAmount: amount
               });
               totalOutAmount += amount;
            } else {
                uint256 outAmount = swap.getAmountOut(token, _outToken, amount);
                fee = TokenFee({
                  token: token,
                  feeAmount: amount,
                  outAmount: outAmount
               });
               totalOutAmount += amount;
            }
            fees[i] = fee;
        }
    }

    function getTokenFee(uint16 _id, address _token) external view returns(uint256 feeAmount){
        return affiliateTokenFees[_id][_token];
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
        address _caller,
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
      if(_amount == 0) revert ZERO_AMOUNT();
      _checkReceive(_token, _amount);
      if(_retryMessage.length != 0){
        if(!hasRole(RETRY_ROLE, _caller)) revert ONLY_RETRY_ROLE();
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
            (uint16 actualRate, uint256 fee) = _getAffiliateFee(_amount, id, rate);
            if(fee != 0){
                totalFee += fee;
                if(totalFee > _amount) revert FEE_BIG_THAN_IN_AMOUNT();
                affiliateTokenFees[id][_token] += fee;
                emit CollectAffiliateFee(_orderId, _token, _amount, id, fee, actualRate);
            }
        }
        afterFee = _amount - totalFee;
    }


    function _getAffiliateFee(uint256 _amount, uint16 _id, uint16 _rate) internal view returns(uint16 rate, uint256 fee){
        AffiliateInfo memory info = affiliateInfos[_id];
        if(info.maxRate != 0 && _rate > info.maxRate){
            rate = info.maxRate;
        } else {
           rate = _rate;
        }
        fee = _amount * rate / DENOMINATOR;
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