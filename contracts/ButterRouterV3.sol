// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@butternetwork/bridge/contracts/interface/IButterBridgeV3.sol";
import "@butternetwork/bridge/contracts/interface/IButterReceiver.sol";
import "./interface/IFeeManager.sol";
import "./abstract/SwapCall.sol";
import "./interface/IButterRouterV3.sol";
import "./abstract/FeeManager.sol";

contract ButterRouterV3 is SwapCall, FeeManager, ReentrancyGuard, IButterReceiver, IButterRouterV3 {
    using SafeERC20 for IERC20;
    using Address for address;

    address public bridgeAddress;
    IFeeManager public feeManager;
    uint256 public gasForReFund = 80000;

    // use to solve deep stack
    struct SwapTemp {
        address srcToken;
        address swapToken;
        uint256 srcAmount;
        uint256 swapAmount;
        bytes32 transferId;
        address referrer;
        address initiator;
        address receiver;
        address target;
        uint256 callAmount;
        uint256 fromChain;
        uint256 toChain;
        uint256 nativeBalance;
        uint256 inputBalance;
        bytes from;
    }

    event Approve(address indexed executor, bool indexed flag);
    event SetFeeManager(address indexed _feeManager);
    event CollectFee(
        address indexed token,
        address indexed receiver,
        address indexed integrator,
        uint256 routerAmount,
        uint256 integratorAmount,
        uint256 nativeAmount,
        uint256 integratorNative,
        bytes32 transferId
    );

    event SetBridgeAddress(address indexed _bridgeAddress);
    event SetGasForReFund(uint256 indexed _gasForReFund);

    constructor(address _bridgeAddress, address _owner, address _wToken) payable SwapCall(_wToken) FeeManager(_owner) {
        _setBridgeAddress(_bridgeAddress);
    }

    function setAuthorization(address[] calldata _executors, bool _flag) external onlyOwner {
        if (_executors.length == 0) revert Errors.EMPTY();
        for (uint i = 0; i < _executors.length; i++) {
            if (!_executors[i].isContract()) revert Errors.NOT_CONTRACT();
            approved[_executors[i]] = _flag;
            emit Approve(_executors[i], _flag);
        }
    }

    function setGasForReFund(uint256 _gasForReFund) external onlyOwner {
        gasForReFund = _gasForReFund;
        emit SetGasForReFund(_gasForReFund);
    }

    function setBridgeAddress(address _bridgeAddress) public onlyOwner returns (bool) {
        _setBridgeAddress(_bridgeAddress);
        return true;
    }

    function setWToken(address _wToken) external onlyOwner {
        _setWToken(_wToken);
    }

    function setFeeManager(address _feeManager) public onlyOwner {
        if (!_feeManager.isContract()) revert Errors.NOT_CONTRACT();
        feeManager = IFeeManager(_feeManager);
        emit SetFeeManager(_feeManager);
    }

    function editFuncBlackList(bytes4 _func, bool _flag) external onlyOwner {
        _editFuncBlackList(_func, _flag);
    }

    function swapAndBridge(
        bytes32 _transferId,
        address _initiator, // initiator address
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData,
        bytes calldata _feeData
    ) external payable override nonReentrant returns (bytes32 orderId) {
        if ((_swapData.length + _bridgeData.length) == 0) revert Errors.DATA_EMPTY();
        SwapTemp memory swapTemp;
        swapTemp.initiator = _initiator;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;
        swapTemp.transferId = _transferId;
        (swapTemp.nativeBalance, swapTemp.inputBalance) = _transferIn(swapTemp.srcToken, swapTemp.srcAmount, _permitData);
        bytes memory receiver;
        FeeDetail memory fd;
        (fd, swapTemp.swapAmount, swapTemp.referrer) = _collectFee(swapTemp.srcToken, swapTemp.srcAmount, _feeData);
        if (_swapData.length != 0) {
            SwapParam memory swapParam = abi.decode(_swapData, (SwapParam));
            (swapTemp.swapToken, swapTemp.swapAmount) = _swap(swapTemp.srcToken, swapTemp.swapAmount, swapTemp.inputBalance, swapParam);
            if (_bridgeData.length == 0 && swapTemp.swapAmount != 0) {
                receiver = abi.encodePacked(swapParam.receiver);
                _transfer(swapTemp.swapToken, swapParam.receiver, swapTemp.swapAmount);
            }
        }
        if (_bridgeData.length != 0) {
            BridgeParam memory bridge = abi.decode(_bridgeData, (BridgeParam));
            swapTemp.toChain = bridge.toChain;
            receiver = bridge.receiver;
            orderId = _doBridge(msg.sender, swapTemp.swapToken, swapTemp.swapAmount, bridge);
        }
        emit CollectFee(
            swapTemp.srcToken,
            fd.routerReceiver,
            fd.integrator,
            fd.routerTokenFee,
            fd.integratorTokenFee,
            fd.routerNativeFee,
            fd.integratorNativeFee,
            orderId
        );
        emit SwapAndBridge(
            swapTemp.referrer,
            swapTemp.initiator,
            msg.sender,
            swapTemp.transferId,
            orderId,
            swapTemp.srcToken,
            swapTemp.swapToken,
            swapTemp.srcAmount,
            swapTemp.swapAmount,
            swapTemp.toChain,
            receiver
        );
        _afterCheck(swapTemp.nativeBalance);
    }

    function swapAndCall(
        bytes32 _transferId,
        address _initiator, // initiator address
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _callbackData,
        bytes calldata _permitData,
        bytes calldata _feeData
    ) external payable override nonReentrant {
        SwapTemp memory swapTemp;
        swapTemp.initiator = _initiator;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.transferId = _transferId;
        (swapTemp.nativeBalance, swapTemp.inputBalance) = _transferIn(swapTemp.srcToken, swapTemp.srcAmount, _permitData);
        if ((_swapData.length + _callbackData.length) == 0) revert Errors.DATA_EMPTY();
        FeeDetail memory fd;
        (fd, swapTemp.swapAmount, swapTemp.referrer) = _collectFee(swapTemp.srcToken, swapTemp.srcAmount, _feeData);
        emit CollectFee(
            swapTemp.srcToken,
            fd.routerReceiver,
            fd.integrator,
            fd.routerTokenFee,
            fd.integratorTokenFee,
            fd.routerNativeFee,
            fd.integratorNativeFee,
            swapTemp.transferId
        );
        (
            swapTemp.receiver,
            swapTemp.target,
            swapTemp.swapToken,
            swapTemp.swapAmount,
            swapTemp.callAmount
        ) = _doSwapAndCall(swapTemp.srcToken, swapTemp.swapAmount, swapTemp.inputBalance , _swapData, _callbackData);

        if (swapTemp.swapAmount > swapTemp.callAmount) {
            _transfer(swapTemp.swapToken, swapTemp.receiver, (swapTemp.swapAmount - swapTemp.callAmount));
        }

        emit SwapAndCall(
            swapTemp.referrer,
            swapTemp.initiator,
            msg.sender,
            swapTemp.transferId,
            swapTemp.srcToken,
            swapTemp.swapToken,
            swapTemp.srcAmount,
            swapTemp.swapAmount,
            swapTemp.receiver,
            swapTemp.target,
            swapTemp.callAmount
        );
        _afterCheck(swapTemp.nativeBalance);
    }

    // _srcToken must erc20 Token or wToken
    function onReceived(
        bytes32 _orderId,
        address _srcToken,
        uint256 _amount,
        uint256 _fromChain,
        bytes calldata _from,
        bytes calldata _swapAndCall
    ) external override nonReentrant {
        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;
        swapTemp.fromChain = _fromChain;
        swapTemp.toChain = block.chainid;
        swapTemp.from = _from;
        if (msg.sender != bridgeAddress) revert Errors.BRIDGE_ONLY();
        {
            uint256 balance = _getBalance(swapTemp.srcToken, address(this));
            if (balance < _amount) revert Errors.RECEIVE_LOW();
            swapTemp.nativeBalance = address(this).balance;
            swapTemp.inputBalance = balance - _amount;
        }
        (bytes memory _swapData, bytes memory _callbackData) = abi.decode(_swapAndCall, (bytes, bytes));
        if ((_swapData.length + _callbackData.length) == 0) revert Errors.DATA_EMPTY();
        bool result = true;
        uint256 minExecGas = gasForReFund;
        if (_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            swapTemp.receiver = swap.receiver;
            if (gasleft() > minExecGas) {
                try
                    this.remoteSwap{gas: gasleft() - minExecGas}(swapTemp.srcToken, swapTemp.srcAmount, swapTemp.inputBalance, swap)
                returns (address dstToken, uint256 dstAmount) {
                    swapTemp.swapToken = dstToken;
                    swapTemp.swapAmount = dstAmount;
                } catch {
                    result = false;
                }
            }
        }

        if (_callbackData.length > 0) {
            CallbackParam memory callParam = abi.decode(_callbackData, (CallbackParam));
            if (swapTemp.receiver == address(0)) {
                swapTemp.receiver = callParam.receiver;
            }
            if (result && gasleft() > minExecGas) {
                try
                    this.remoteCall{gas: gasleft() - minExecGas}(callParam, swapTemp.swapToken, swapTemp.swapAmount)
                returns (address target, uint256 callAmount) {
                    swapTemp.target = target;
                    swapTemp.callAmount = callAmount;
                    swapTemp.receiver = callParam.receiver;
                } catch {}
            }
        }
        if (swapTemp.swapAmount > swapTemp.callAmount) {
            _transfer(swapTemp.swapToken, swapTemp.receiver, (swapTemp.swapAmount - swapTemp.callAmount));
        }
        emit RemoteSwapAndCall(
            _orderId,
            swapTemp.receiver,
            swapTemp.target,
            swapTemp.srcToken,
            swapTemp.swapToken,
            swapTemp.srcAmount,
            swapTemp.swapAmount,
            swapTemp.callAmount,
            swapTemp.fromChain,
            swapTemp.toChain,
            swapTemp.from
        );
        _afterCheck(swapTemp.nativeBalance);
    }

    function getFee(
        address _inputToken,
        uint256 _inputAmount,
        bytes calldata _feeData
    ) external view override returns (address feeToken, uint256 tokenFee, uint256 nativeFee, uint256 afterFeeAmount) {
        IFeeManager.FeeDetail memory fd = _getFee(_inputToken, _inputAmount, _feeData);
        feeToken = fd.feeToken;
        if (_isNative(_inputToken)) {
            tokenFee = 0;
            nativeFee = fd.routerNativeFee + fd.routerTokenFee + fd.integratorTokenFee + fd.integratorNativeFee;
            afterFeeAmount = _inputAmount - nativeFee;
        } else {
            tokenFee = fd.routerTokenFee + fd.integratorTokenFee;
            nativeFee = fd.routerNativeFee + fd.integratorNativeFee;
            afterFeeAmount = _inputAmount - tokenFee;
        }
    }

    function _getFee(
        address _inputToken,
        uint256 _inputAmount,
        bytes calldata _feeData
    ) internal view returns (FeeDetail memory fd) {
        if (address(feeManager) == ZERO_ADDRESS) {
            fd = this.getFeeDetail(_inputToken, _inputAmount, _feeData);
        } else {
            fd = feeManager.getFeeDetail(_inputToken, _inputAmount, _feeData);
        }
    }

    function getInputBeforeFee(
        address _token,
        uint256 _amountAfterFee,
        bytes calldata _feeData
    ) external view override returns (address _feeToken, uint256 _input, uint256 _fee) {
        if (address(feeManager) == ZERO_ADDRESS) {
            return this.getAmountBeforeFee(_token, _amountAfterFee, _feeData);
        }
        return feeManager.getAmountBeforeFee(_token, _amountAfterFee, _feeData);
    }

    function remoteSwap(
        address _srcToken,
        uint256 _amount,
        uint256 _initBalance,
        SwapParam memory swapParam
    ) external returns (address dstToken, uint256 dstAmount) {
        if (msg.sender != address(this)) revert Errors.SELF_ONLY();
        (dstToken, dstAmount) = _swap(_srcToken, _amount, _initBalance, swapParam);
    }

    function remoteCall(
        CallbackParam memory _callbackParam,
        address _callToken,
        uint256 _amount
    ) external returns (address target, uint256 callAmount) {
        if (msg.sender != address(this)) revert Errors.SELF_ONLY();
        target = _callbackParam.target;
        callAmount = _callBack(_amount, _callToken, _callbackParam);
    }

    function _doSwapAndCall(
        address _srcToken,
        uint256 _amount,
        uint256 _initBalance,
        bytes memory _swapData,
        bytes memory _callbackData
    ) internal returns (address receiver, address target, address dstToken, uint256 swapOutAmount, uint256 callAmount) {
        swapOutAmount = _amount;
        dstToken = _srcToken;
        if (_swapData.length > 0) {
            SwapParam memory swapParam = abi.decode(_swapData, (SwapParam));
            (dstToken, swapOutAmount) = _swap(_srcToken, _amount, _initBalance, swapParam);
            receiver = swapParam.receiver;
        }
        if (_callbackData.length > 0) {
            CallbackParam memory callbackParam = abi.decode(_callbackData, (CallbackParam));
            callAmount = _callBack(swapOutAmount, dstToken, callbackParam);
            receiver = callbackParam.receiver;
            target = callbackParam.target;
        }
    }

    function _doBridge(
        address _sender,
        address _token,
        uint256 _amount,
        BridgeParam memory _bridge
    ) internal returns (bytes32 _orderId) {
        uint256 value;
        address bridgeAddr = bridgeAddress;
        if (_isNative(_token)) {
            value = _amount + _bridge.nativeFee;
        } else {
            value = _bridge.nativeFee;
            IERC20(_token).forceApprove(bridgeAddr, _amount);
        }
        _orderId = IButterBridgeV3(bridgeAddr).swapOutToken{value: value}(
            _sender,
            _token,
            _bridge.receiver,
            _amount,
            _bridge.toChain,
            _bridge.data
        );
    }

    function _collectFee(
        address _token,
        uint256 _amount,
        bytes calldata _feeData
    ) internal returns (FeeDetail memory fd, uint256 remain, address referrer) {
        fd = _getFee(_token, _amount, _feeData);
        referrer = fd.integrator;
        if (_isNative(_token)) {
            uint256 routerNative = fd.routerNativeFee + fd.routerTokenFee;
            if (routerNative > 0) {
                _transfer(_token, fd.routerReceiver, routerNative);
            }
            uint256 integratorNative = fd.integratorTokenFee + fd.integratorNativeFee;
            if (integratorNative > 0) {
                _transfer(_token, fd.integrator, integratorNative);
            }
            remain = _amount - routerNative - integratorNative;
        } else {
            if (fd.routerNativeFee > 0) {
                _transfer(ZERO_ADDRESS, fd.routerReceiver, fd.routerNativeFee);
            }
            if (fd.routerTokenFee > 0) {
                _transfer(_token, fd.routerReceiver, fd.routerTokenFee);
            }
            if (fd.integratorNativeFee > 0) {
                _transfer(ZERO_ADDRESS, fd.integrator, fd.integratorNativeFee);
            }
            if (fd.integratorTokenFee > 0) {
                _transfer(_token, fd.integrator, fd.integratorTokenFee);
            }
            remain = _amount - fd.routerTokenFee - fd.integratorTokenFee;

            if (fd.routerNativeFee + fd.integratorNativeFee > msg.value) revert Errors.FEE_MISMATCH();
        }
        if (remain == 0) revert Errors.ZERO_IN();
    }

    function _setBridgeAddress(address _bridgeAddress) internal returns (bool) {
        if (!_bridgeAddress.isContract()) revert Errors.NOT_CONTRACT();
        bridgeAddress = _bridgeAddress;
        emit SetBridgeAddress(_bridgeAddress);
        return true;
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        _transfer(_token, msg.sender, _amount);
    }

    receive() external payable {}
}
