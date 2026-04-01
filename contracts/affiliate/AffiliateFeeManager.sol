// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interface/IAffiliateFeeManager.sol";
import "../interface/IFlash_Swap.sol";

contract AffiliateFeeManager is Initializable, UUPSUpgradeable, AccessControlEnumerable, IAffiliateFeeManager {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    uint256 public constant DENOMINATOR = 10000;

    using SafeERC20 for IERC20;

    IFlash_Swap public swap;
    address public relayExecutor;
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

    struct AffiliateFee {
        uint16 id;
        uint16 rate;
        uint256 fee;
    }

    mapping(address => bool) public whitelist;
    mapping(string => uint16) private nicknameToId;
    mapping(address => uint16) private walletToId;
    mapping(uint16 => AffiliateInfo) private affiliateInfos;
    mapping(uint16 => mapping(address => uint256)) private affiliateTokenFees;

    uint256 public registerFee;

    mapping(uint16 => mapping(address => uint256)) private totalWithdrawedTokenFees;

    mapping(uint16 => string) private idToShortName;

    mapping(string => uint16) private shortNameToId;

    error ZERO_ADDRESS();
    error NOT_CONTRACT();
    error ONLY_RELAY_EXECUTOR();
    error INVALID_MAX_VALUE();
    error AFFILIATE_NOT_EXIST();
    error FEE_BIG_THAN_IN_AMOUNT();
    error WALLET_REGISTERED();
    error NICKNAME_REGISTERED();
    error ONLY_WALLET();
    error EMPTY_TOKENS();
    error ONLY_WHITELIST();
    error INVALID_NICKNAME();
    error ZERO_AMOUNT();

    event UpdateRegisterFee(uint256 _registerFee);
    event Set(uint16 id, uint16 base, uint256 max);
    event UpdateWhitelist(address _user, bool _flag);
    event SetMaxAffiliateFeeRate(uint16 _maxAffiliateFee);
    event Register(uint16 id, address wallet, string nickname);
    event TriggerRegisterWhitelist(bool _isRegisterNeedWhitelist);
    event SetExecutorAndSwap(address _relayExcutor, address _swap);
    event AdminWithdraw(address _token, address _receiver, uint256 _amount);
    event WithdrawFee(uint16 id, address outToken, uint256 totalOutAmount, TokenFee[] fees);
    event CollectAffiliateFee(
        bytes32 orderId,
        address token,
        uint256 amount,
        AffiliateFee[] fees 
    );

    event UpdateShortName(uint16 id, string shortName);

    constructor() {
        _disableInitializers();
    }

    function initialize(address _admin) external initializer {
        if (_admin == address(0)) revert ZERO_ADDRESS();
        maxAffiliateFeeRate = 3000;
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function setExecutorAndSwap(address _relayExecutor, address _swap) external onlyRole(MANAGER_ROLE) {
        if (_relayExecutor.code.length == 0 || _swap.code.length == 0) revert NOT_CONTRACT();
        swap = IFlash_Swap(_swap);
        relayExecutor = _relayExecutor;
        emit SetExecutorAndSwap(_relayExecutor, _swap);
    }

    function setMaxAffiliateFeeRate(uint16 _maxAffiliateFeeRate) external onlyRole(MANAGER_ROLE) {
        maxAffiliateFeeRate = _maxAffiliateFeeRate;
        emit SetMaxAffiliateFeeRate(_maxAffiliateFeeRate);
    }

    function triggerRegisterWhitelist() external onlyRole(MANAGER_ROLE) {
        isRegisterNeedWhitelist = !isRegisterNeedWhitelist;
        emit TriggerRegisterWhitelist(isRegisterNeedWhitelist);
    }

    function updateWhitelist(address _user, bool _flag) external onlyRole(MANAGER_ROLE) {
        whitelist[_user] = _flag;
        emit UpdateWhitelist(_user, _flag);
    }

    function updateRegisterFee(uint256 _registerFee) external onlyRole(MANAGER_ROLE) {
        registerFee = _registerFee;
        emit UpdateRegisterFee(_registerFee);
    }

    function adminRegister(address _wallet, string calldata _nickname) external onlyRole(MANAGER_ROLE) {
        if (_wallet == address(0)) revert ZERO_ADDRESS();
        _register(_wallet, _nickname);
    }

    function register(string calldata _nickname) external payable {
        address _wallet = msg.sender;
        uint256 fee = getUserRegisterFee(_wallet);
        if(msg.value != fee) revert ONLY_WHITELIST();
        _register(_wallet, _nickname);
    }

    function updateWallet(uint16 _id, address _wallet) external {
        if(_wallet == address(0)) revert ZERO_ADDRESS();
        if (walletToId[_wallet] != 0) revert WALLET_REGISTERED();
        AffiliateInfo storage info = affiliateInfos[_id];
        _check(info.wallet);
        walletToId[info.wallet] = 0;
        walletToId[_wallet] = info.id;
        info.wallet = _wallet;
        emit Register(_id, _wallet, info.nickname);
    }

    function updateNickname(uint16 _id, string calldata _nickname) external {
        if(!_isValidNickname(_nickname)) revert INVALID_NICKNAME();
        if (nicknameToId[_nickname] != 0) revert NICKNAME_REGISTERED();
        AffiliateInfo storage info = affiliateInfos[_id];
        _check(info.wallet);
        nicknameToId[info.nickname] = 0;
        nicknameToId[_nickname] = info.id;
        info.nickname = _nickname;
        emit Register(_id, info.wallet, _nickname);
    }

    function updateShortName(uint16 _id, string calldata _shortName) external {
        if(!_isValidShortName(_shortName)) revert INVALID_NICKNAME();
        if(shortNameToId[_shortName] != 0) revert NICKNAME_REGISTERED();
        AffiliateInfo storage info = affiliateInfos[_id];
        _check(info.wallet);
        string memory oldShortName = idToShortName[_id];
        shortNameToId[oldShortName] = 0;
        shortNameToId[_shortName] = info.id;
        idToShortName[_id] = _shortName;
        emit UpdateShortName(_id, _shortName);
    }

    function _register(address _wallet, string calldata _nickname) internal {
        if(!_isValidNickname(_nickname)) revert INVALID_NICKNAME();
        if (walletToId[_wallet] != 0) revert WALLET_REGISTERED();
        if (nicknameToId[_nickname] != 0) revert NICKNAME_REGISTERED();
        currentRegisterId++;
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
        _check(info.wallet);
        require(_max >= _base);
        if (_max > maxAffiliateFeeRate) revert INVALID_MAX_VALUE();
        info.maxRate = _max;
        info.baseRate = _base;
        emit Set(_id, _base, _max);
    }

    function withdrawFee(uint16 _id, address[] calldata _tokens, address _outToken) external {
        AffiliateInfo storage info = affiliateInfos[_id];
        _check(info.wallet);
        uint256 len = _tokens.length;
        if (len == 0) revert EMPTY_TOKENS();
        TokenFee[] memory fees = new TokenFee[](len);
        uint256 totalOutAmount;
        for (uint256 i = 0; i < len; i++) {
            address token = _tokens[i];
            uint256 amount = affiliateTokenFees[_id][token];
            affiliateTokenFees[_id][token] = 0;
            totalWithdrawedTokenFees[_id][token] += amount;
            TokenFee memory fee;
            if (amount == 0) {
                fee = TokenFee({token: token, feeAmount: 0, outAmount: 0});
            } else if (token == _outToken) {
                fee = TokenFee({token: token, feeAmount: amount, outAmount: amount});
                totalOutAmount += amount;
            } else {
                IERC20(token).forceApprove(address(swap), amount);
                uint256 outAmount = swap.swap(token, _outToken, amount, 1, address(this));
                fee = TokenFee({token: token, feeAmount: amount, outAmount: outAmount});
                totalOutAmount += outAmount;
            }
            fees[i] = fee;
        }
        if(totalOutAmount == 0) revert ZERO_AMOUNT();
        IERC20(_outToken).safeTransfer(info.wallet, totalOutAmount);
        emit WithdrawFee(_id, _outToken, totalOutAmount, fees);
    }

    function getTokenWithdrawedAmount(uint16 _id, address _token) external view returns(uint256) {
        return totalWithdrawedTokenFees[_id][_token];
    }

    function getUserRegisterFee(address _wallet) public view returns(uint256 fee) {
        fee = whitelist[_wallet] ? 0 : registerFee;
    }

    function getInfoById(uint16 _id) external view returns (AffiliateInfo memory info) {
        return affiliateInfos[_id];
    }

    function getInfoByWallet(address _wallet) external view returns (AffiliateInfo memory info) {
        return affiliateInfos[walletToId[_wallet]];
    }

    function getInfoByNickname(string calldata _nickname) external view returns (AffiliateInfo memory info) {
        return affiliateInfos[nicknameToId[_nickname]];
    }

    function getInfoByShortName(string calldata _shortName) external view returns (AffiliateInfo memory info) {
        return affiliateInfos[shortNameToId[_shortName]];
    }

    function getShortNameById(uint16 _id) external view returns (string memory shortName) {
        return idToShortName[_id];
    }

    function getShortNameByNickname(string calldata _nickname) external view returns (string memory shortName) {
        return idToShortName[nicknameToId[_nickname]];
    }

    function getShortNameByWallet(address _wallet) external view returns (string memory shortName) {
        return idToShortName[walletToId[_wallet]];
    }

    function getTokenFeeInfos(
        uint16 _id,
        address[] calldata _tokens,
        address _outToken
    ) external view returns (uint256 totalOutAmount, TokenFee[] memory fees) {
        uint256 len = _tokens.length;
        fees = new TokenFee[](len);
        for (uint i = 0; i < len; i++) {
            address token = _tokens[i];
            uint256 amount = affiliateTokenFees[_id][token];
            TokenFee memory fee;
            if (amount == 0) {
                fee = TokenFee({token: token, feeAmount: 0, outAmount: 0});
            } else if (token == _outToken) {
                fee = TokenFee({token: token, feeAmount: amount, outAmount: amount});
                totalOutAmount += amount;
            } else {
                uint256 outAmount = swap.getAmountOut(token, _outToken, amount);
                fee = TokenFee({token: token, feeAmount: amount, outAmount: outAmount});
                totalOutAmount += outAmount;
            }
            fees[i] = fee;
        }
    }

    function getTokenFee(uint16 _id, address _token) external view returns (uint256 feeAmount) {
        return affiliateTokenFees[_id][_token];
    }

    function getAffiliatesFee(
        uint256 amount,
        bytes calldata feeData
    ) external view override returns (uint256 totalFee) {
        uint256 offset;
        uint256 len = uint256(uint8(bytes1(feeData[offset:(offset += 1)])));
        if (len == 0) return totalFee;
        for (uint256 i = 0; i < len; i++) {
            uint16 id = uint16(bytes2(feeData[offset:(offset += 2)]));
            uint16 rate = uint16(bytes2(feeData[offset:(offset += 2)]));
            (, uint256 fee) = _getAffiliateFee(amount, id, rate);
            if (fee != 0) {
                totalFee += fee;
            }
        }
        if (totalFee > amount) totalFee = amount;
    }

    // affiliates n * (2 byte affiliateId + 2 byte fee rate)
    function collectAffiliatesFee(
        bytes32 orderId,
        address token,
        uint256 amount,
        bytes calldata feeData
    ) external override returns (uint256 totalFee) {
        if (
            msg.sender != relayExecutor &&
            msg.sender != 0xCA9a3C761dC02B5784f77409bf641Bf6482AAA94 && 
            msg.sender != 0x42D64eD9381bF456697b0C360e8acE139F176a80 &&
            msg.sender != 0x00004080D86e1077ce96E67C1B167fF105025307
        ) revert ONLY_RELAY_EXECUTOR();

        uint256 offset;
        uint256 len = feeData.length / 4;
        AffiliateFee[] memory fees = new AffiliateFee[](len);
        for (uint256 i = 0; i < len; i++) {
            uint16 id = uint16(bytes2(feeData[offset:(offset += 2)]));
            uint16 rate = uint16(bytes2(feeData[offset:(offset += 2)]));
            (uint16 actualRate, uint256 fee) = _getAffiliateFee(amount, id, rate);
            fees[i] = AffiliateFee({
                id: id,
                rate: actualRate,
                fee : fee
            });
            if (fee != 0) {
                totalFee += fee;
                if (totalFee > amount) revert FEE_BIG_THAN_IN_AMOUNT();
                affiliateTokenFees[id][token] += fee;
            }
        }
        emit CollectAffiliateFee(orderId, token, amount, fees);
    }

    function _getAffiliateFee(
        uint256 _amount,
        uint16 _id,
        uint16 _rate
    ) internal view returns (uint16 rate, uint256 fee) {
        AffiliateInfo memory info = affiliateInfos[_id];
        if (info.wallet == address(0)) return (0, 0);
        if (info.maxRate != 0) {
            rate = (_rate > info.maxRate) ? info.maxRate : _rate;
        } else {
            rate = (_rate > maxAffiliateFeeRate) ? maxAffiliateFeeRate : _rate;
        }
        fee = (_amount * rate) / DENOMINATOR;
    }

    function _isValidNickname(string memory str) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        uint256 len = strBytes.length;
        if(len > 32 || len < 3) return false;
        for (uint256 i = 0; i < len; i++) {
            bytes1 char = strBytes[i];
            // a-z (ASCII 97-122)
            if (char >= 0x61 && char <= 0x7A) {
                continue;
            }
            // 0-9 (ASCII 48-57)
            if (char >= 0x30 && char <= 0x39) {
                continue;
            }
            // - (ASCII 45) and _ (ASCII 95)
            if (char == 0x2D || char == 0x5F) {
                continue;
            }
            return false;
        }
        return true;
    }


    function _isValidShortName(string memory str) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        uint256 len = strBytes.length;
        if(len == 0 || len > 2) return false;
        for (uint256 i = 0; i < len; i++) {
            bytes1 char = strBytes[i];
            // a-z (ASCII 97-122)
            if (char >= 0x61 && char <= 0x7A) {
                continue;
            }
            // 0-9 (ASCII 48-57)
            if (char >= 0x30 && char <= 0x39) {
                continue;
            }
            // - (ASCII 45) and _ (ASCII 95)
            if (char == 0x2D || char == 0x5F) {
                continue;
            }
            return false;
        }
        return true;
    }

    function _check(address wallet) internal view {
        if(wallet == address(0)) revert AFFILIATE_NOT_EXIST();
        if(!(wallet == msg.sender || hasRole(MANAGER_ROLE, msg.sender))) revert ONLY_WALLET();
    }

    /** UUPS *********************************************************/
    function _authorizeUpgrade(address) internal view override {
        require(hasRole(UPGRADER_ROLE, msg.sender), "only upgrade role");
    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }

    function adminWithdraw(address _token, address _receiver, uint256 _amount) external onlyRole(MANAGER_ROLE){
        if(_receiver == address(0)) revert ZERO_ADDRESS();
        if(_token == address(0)){
            (bool result, )= payable(_receiver).call{value: _amount}("");
            require(result);
        } else {
            IERC20(_token).safeTransfer(_receiver, _amount);
        }
        emit AdminWithdraw(_token, _receiver, _amount);
    }
}
