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

contract ButterRouterV3 is Ownable2Step, SwapCall, ReentrancyGuard, IButterReceiver {
    using SafeERC20 for IERC20;
    using Address for address;

    address public bridgeAddress;
    IFeeManager public feeManager;
    uint256 public gasForReFund = 80000;

    struct BridgeParam {
        uint256 toChain;
        uint256 nativeFee;
        bytes receiver;
        bytes data;
    }

    // use to solve deep stack
    struct SwapTemp {
        address srcToken;
        address swapToken;
        uint256 srcAmount;
        uint256 swapAmount;
        bytes32 transferId;
        address receiver;
        address target;
        uint256 callAmount;
        uint256 fromChain;
        uint256 toChain;
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
    event SwapAndBridge(
        bytes32 indexed orderId,
        address indexed from,
        address indexed originToken,
        address bridgeToken,
        uint256 originAmount,
        uint256 bridgeAmount,
        uint256 fromChain,
        uint256 toChain,
        bytes to
    );
    event SwapAndCall(
        address indexed from,
        address indexed receiver,
        address indexed target,
        bytes32 transferId,
        address originToken,
        address swapToken,
        uint256 originAmount,
        uint256 swapAmount,
        uint256 callAmount
    );
    event RemoteSwapAndCall(
        bytes32 indexed orderId,
        address indexed receiver,
        address indexed target,
        address originToken,
        address swapToken,
        uint256 originAmount,
        uint256 swapAmount,
        uint256 callAmount,
        uint256 fromChain,
        uint256 toChain,
        bytes from
    );

    constructor(address _bridgeAddress, address _owner, address _wToken) payable SwapCall(_wToken) {
        _setBridgeAddress(_bridgeAddress);
        _transferOwnership(_owner);
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

    function setFeeManager(address _feeManager) public onlyOwner {
        if (!_feeManager.isContract()) revert Errors.NOT_CONTRACT();
        feeManager = IFeeManager(_feeManager);
        emit SetFeeManager(_feeManager);
    }

    function swapAndBridge(
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData,
        address _referrer,
        uint256 _fee
    ) external payable nonReentrant transferIn(_srcToken, _amount, _permitData) {
        if ((_swapData.length + _bridgeData.length) == 0) revert Errors.DATA_EMPTY();
        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;
        bytes memory receiver;
        swapTemp.swapAmount = _collectFee(swapTemp.srcToken, swapTemp.srcAmount, swapTemp.transferId, _referrer, _fee);
        if (_swapData.length != 0) {
            SwapParam memory swapParam = abi.decode(_swapData, (SwapParam));
            (swapTemp.swapToken, swapTemp.swapAmount) = _swap(swapTemp.swapAmount, swapTemp.srcToken, swapParam);
            if (_bridgeData.length == 0 && swapTemp.swapAmount != 0) {
                receiver = abi.encodePacked(swapParam.receiver);
                _transfer(swapTemp.swapToken, swapParam.receiver, swapTemp.swapAmount);
            }
        }
        bytes32 orderId;
        if (_bridgeData.length != 0) {
            BridgeParam memory bridge = abi.decode(_bridgeData, (BridgeParam));
            swapTemp.toChain = bridge.toChain;
            receiver = bridge.receiver;
            orderId = _doBridge(msg.sender, swapTemp.swapToken, swapTemp.swapAmount, bridge);
        }
        emit SwapAndBridge(
            orderId,
            msg.sender,
            swapTemp.srcToken,
            swapTemp.swapToken,
            swapTemp.srcAmount,
            swapTemp.swapAmount,
            block.chainid,
            swapTemp.toChain,
            receiver
        );
    }

    function swapAndCall(
        bytes32 _transferId,
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _callbackData,
        bytes calldata _permitData,
        address _referrer,
        uint256 _fee
    ) external payable nonReentrant transferIn(_srcToken, _amount, _permitData) {
        SwapTemp memory swapTemp;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.transferId = _transferId;
        if ((_swapData.length + _callbackData.length) == 0) revert Errors.DATA_EMPTY();
        swapTemp.swapAmount = _collectFee(swapTemp.srcToken, swapTemp.srcAmount, swapTemp.transferId, _referrer, _fee);

        (
            swapTemp.receiver,
            swapTemp.target,
            swapTemp.swapToken,
            swapTemp.swapAmount,
            swapTemp.callAmount
        ) = _doSwapAndCall(_swapData, _callbackData, swapTemp.srcToken, swapTemp.swapAmount);

        if (swapTemp.swapAmount > swapTemp.callAmount) {
            _transfer(swapTemp.swapToken, swapTemp.receiver, (swapTemp.swapAmount - swapTemp.callAmount));
        }

        emit SwapAndCall(
            msg.sender,
            swapTemp.receiver,
            swapTemp.target,
            swapTemp.transferId,
            swapTemp.srcToken,
            swapTemp.swapToken,
            swapTemp.srcAmount,
            swapTemp.swapAmount,
            swapTemp.callAmount
        );
    }

    // _srcToken must erc20 Token or wToken
    function onReceived(
        bytes32 _orderId,
        address _srcToken,
        uint256 _amount,
        uint256 _fromChain,
        bytes calldata _from,
        bytes calldata _swapAndCall
    ) external nonReentrant {
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
            nativeBalanceBeforeExec = address(this).balance;
            initInputTokenBalance = balance - _amount;
        }
        (bytes memory _swapData, bytes memory _callbackData) = abi.decode(_swapAndCall, (bytes, bytes));
        if ((_swapData.length + _callbackData.length) == 0) revert Errors.DATA_EMPTY();
        bool result = true;
        uint256 minExecGas = gasForReFund * 2;
        if (_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            swapTemp.receiver = swap.receiver;
            if (gasleft() > minExecGas) {
                try
                    this.doRemoteSwap{gas: gasleft() - gasForReFund}(swap, swapTemp.srcToken, swapTemp.srcAmount)
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
                    this.doRemoteCall{gas: gasleft() - gasForReFund}(callParam, swapTemp.swapToken, swapTemp.swapAmount)
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
        if (address(this).balance < nativeBalanceBeforeExec) revert Errors.NATIVE_VALUE_OVERSPEND();
        initInputTokenBalance = 0;
        nativeBalanceBeforeExec = 0;
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
    }

    function getFee(
        address inputToken,
        uint256 inputAmount,
        address referrer,
        uint256 fee
    ) external view returns (address feeToken, uint256 amount, uint256 nativeAmount) {
        if (address(feeManager) == ZERO_ADDRESS) return (ZERO_ADDRESS, 0, 0);
        IFeeManager.FeeDetail memory fd = feeManager.getFee(referrer, inputToken, inputAmount, fee);
        feeToken = fd.feeToken;
        if (_isNative(inputToken)) {
            amount = 0;
            nativeAmount = fd.routerNative + fd.routerToken + fd.integratorToken + fd.integratorNative;
        } else {
            amount = fd.routerToken + fd.integratorToken;
            nativeAmount = fd.routerNative + fd.integratorNative;
        }
    }

    function getAmountBeforeFee(
        address inputToken,
        uint256 inputAmount,
        address referrer,
        uint256 fee
    ) external view returns (address feeToken, uint256 beforeAmount) {
        if (address(feeManager) == ZERO_ADDRESS) return (ZERO_ADDRESS, 0);
        return feeManager.getAmountBeforeFee(referrer, inputToken, inputAmount, fee);
    }

    function doRemoteSwap(
        SwapParam memory swapParam,
        address _srcToken,
        uint256 _amount
    ) external returns (address dstToken, uint256 dstAmount) {
        if(msg.sender != address(this)) revert Errors.SELF_ONLY();
        (dstToken, dstAmount) = _swap(_amount, _srcToken, swapParam);
    }

    function doRemoteCall(
        CallbackParam memory _callbackParam,
        address _callToken,
        uint256 _amount
    ) external returns (address target, uint256 callAmount) {
        if(msg.sender != address(this)) revert Errors.SELF_ONLY();
        target = _callbackParam.target;
        callAmount = _callBack(_amount, _callToken, _callbackParam);
    }

    function _doSwapAndCall(
        bytes memory _swapData,
        bytes memory _callbackData,
        address _srcToken,
        uint256 _amount
    ) internal returns (address receiver, address target, address dstToken, uint256 swapOutAmount, uint256 callAmount) {
        swapOutAmount = _amount;
        dstToken = _srcToken;
        if (_swapData.length > 0) {
            SwapParam memory swapParam = abi.decode(_swapData, (SwapParam));
            (dstToken, swapOutAmount) = _swap(_amount, _srcToken, swapParam);
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
        if (_isNative(_token)) {
            value = _amount + _bridge.nativeFee;
        } else {
            value = _bridge.nativeFee;
            IERC20(_token).forceApprove(bridgeAddress, _amount);
        }
        _orderId = IButterBridgeV3(bridgeAddress).swapOutToken{value: value}(
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
        bytes32 _transferId,
        address _referrer,
        uint256 _fee
    ) internal returns (uint256 _remain) {
        // _token == fd.feeToken
        if (address(feeManager) == ZERO_ADDRESS) return (_amount);
        IFeeManager.FeeDetail memory fd = feeManager.getFee(_referrer, _token, _amount, _fee);
        if (_isNative(_token)) {
            uint256 native = fd.routerNative + fd.routerToken;
            if (native > 0) {
                _transfer(_token, fd.routerReceiver, native);
            }
            uint256 integratorNative = fd.integratorToken + fd.integratorNative;
            if (fd.integratorToken > 0) {
                _transfer(_token, _referrer, integratorNative);
            }
            _remain = _amount - native - integratorNative;
        } else {
            if (fd.routerNative > 0) {
                _transfer(ZERO_ADDRESS, fd.routerReceiver, fd.routerNative);
            }
            if (fd.routerToken > 0) {
                _transfer(_token, fd.routerReceiver, fd.routerToken);
            }
            if (fd.integratorNative > 0) {
                _transfer(ZERO_ADDRESS, _referrer, fd.integratorNative);
            }
            if (fd.integratorToken > 0) {
                _transfer(_token, _referrer, fd.integratorToken);
            }
            _remain = _amount - fd.routerToken - fd.integratorToken;
        }
        emit CollectFee(
            _token,
            fd.routerReceiver,
            _referrer,
            fd.routerToken,
            fd.routerToken,
            fd.routerNative,
            fd.integratorNative,
            _transferId
        );
    }

    function _setBridgeAddress(address _bridgeAddress) internal returns (bool) {
        if (!_bridgeAddress.isContract()) revert Errors.NOT_CONTRACT();
        bridgeAddress = _bridgeAddress;
        emit SetBridgeAddress(_bridgeAddress);
        return true;
    }

    receive() external payable {}
}
