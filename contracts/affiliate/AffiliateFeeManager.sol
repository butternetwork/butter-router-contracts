// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interface/IAffiliateFeeManager.sol";
import "../interface/IFlash_Swap.sol";

contract AffiliateFeeManager is
    Initializable,
    UUPSUpgradeable,
    AccessControlEnumerable,
    IAffiliateFeeManager
{
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    uint256 public constant DENOMINATOR = 10000;

    using SafeERC20 for IERC20;

    IFlash_Swap public swap;
    address public relayExecytor;
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

    error ZERO_ADDRESS();
    error NOT_CONTRACT();
    error ONLY_RELAY_EXCUTOR();
    error INVALID_MAX_VALUE();
    error AFFILIATE_NOT_EXIST();
    error FEE_BIG_THAN_IN_AMOUNT();
    error WALLET_REGISTERED();
    error NICKNAME_REGISTERED();
    error ONLY_WALLET();
    error EMPTY_TOKENS();
    error ONLY_WHITELIST();

    
    event Set(uint16 id, uint16 base, uint256 max);
    event UpdateWhitelist(address _user, bool _flag);
    event SetMaxAffiliateFeeRate(uint16 _maxAffiliateFee);
    event Register(uint16 id, address wallet, string nickname);
    event TriggleRegisterWhitelist(bool _isRegisterNeedWhitelist);
    event SetExcutorAndSwap(address _relayExcutor, address _swap);
    event WithrawFee(uint16 id, address outToken, uint256 totalOutAmount, TokenFee[] fees);
    event CollectAffiliateFee(bytes32 orderId, address token, uint256 amount, uint16 affiliateId, uint256 fee, uint16 rate);

    constructor() {
         _disableInitializers(); 
    }

    function initialize(address _admin) external initializer {
        if(_admin == address(0)) revert ZERO_ADDRESS();
        maxAffiliateFeeRate = 3000;
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }


    function setExcutorAndSwap(address _relayExcutor, address _swap) external onlyRole(MANAGER_ROLE){
        if(_relayExcutor.code.length == 0 || _swap.code.length == 0) revert NOT_CONTRACT();
        swap = IFlash_Swap(_swap);
        relayExecytor = _relayExcutor;
        emit SetExcutorAndSwap(_relayExcutor, _swap);
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


    function adminRegister(address _wallet, string calldata _nickname) external onlyRole(MANAGER_ROLE) {
        if(_wallet == address(0)) revert ZERO_ADDRESS();
        _register(_wallet, _nickname);
    }

    function register(string calldata _nickname) external {
        address _wallet = msg.sender;
        if(isRegisterNeedWhitelist){
            if(!whitelist[_wallet]) revert ONLY_WHITELIST();
        }
        _register(_wallet, _nickname);
    }

    function _register(address _wallet, string calldata _nickname) internal {
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
               totalOutAmount += outAmount;
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
               totalOutAmount += outAmount;
            }
            fees[i] = fee;
        }
    }

    function getTokenFee(uint16 _id, address _token) external view returns(uint256 feeAmount){
        return affiliateTokenFees[_id][_token];
    }

    function getAffiliatesFee(uint256 amount, bytes calldata feeData) external view override returns(uint256 totalFee) {
        uint256 offset;
        uint256 len = uint256(uint8(bytes1(feeData[offset: (offset += 1)])));
        if(len == 0) return totalFee;
        for (uint256 i = 0; i < len; i++) {
            uint16 id = uint16(bytes2(feeData[offset: (offset += 2)]));
            uint16 rate = uint16(bytes2(feeData[offset: (offset += 2)]));
            (, uint256 fee) = _getAffiliateFee(amount, id, rate);
            if(fee != 0){
                totalFee += fee;
            }
        }
        if(totalFee > amount) totalFee = amount;
    }

    // affiliates n * (2 byte affiliateId + 2 byte fee rate)
    function collectAffiliatesFee(bytes32 orderId, address token, uint256 amount, bytes calldata feeData) external override returns(uint256 totalFee){
        if(msg.sender != relayExecytor) revert ONLY_RELAY_EXCUTOR();
        uint256 len = feeData.length / 4;
        uint256 offset;
        for (uint256 i = 0; i < len; i++) {
            uint16 id = uint16(bytes2(feeData[offset: (offset += 2)]));
            uint16 rate = uint16(bytes2(feeData[offset: (offset += 2)]));
            (uint16 actualRate, uint256 fee) = _getAffiliateFee(amount, id, rate);
            if(fee != 0){
                totalFee += fee;
                if(totalFee > amount) revert FEE_BIG_THAN_IN_AMOUNT();
                affiliateTokenFees[id][token] += fee;
                emit CollectAffiliateFee(orderId, token, amount, id, fee, actualRate);
            }
        }
    }

    function _getAffiliateFee(uint256 _amount, uint16 _id, uint16 _rate) internal view returns(uint16 rate, uint256 fee){
        AffiliateInfo memory info = affiliateInfos[_id];
        if(info.wallet == address(0)) return(0, 0);
        if(info.maxRate != 0 && _rate > info.maxRate){
            rate = info.maxRate;
        } else {
           rate = _rate;
        }
        fee = _amount * rate / DENOMINATOR;
    }


    /** UUPS *********************************************************/
    function _authorizeUpgrade(address) internal view override {
        require(hasRole(UPGRADER_ROLE, msg.sender), "only upgrade role");
    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }

}