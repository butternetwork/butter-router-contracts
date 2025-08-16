// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@butternetwork/bridge/contracts/interface/IButterBridgeV3.sol";
import "./interface/IFeeManager.sol";
import "./abstract/SwapCallV2.sol";
import "./interface/IButterRouterV3.sol";
import "./abstract/FeeManager.sol";

contract ButterRouterV31 is SwapCallV2, FeeManager, ReentrancyGuard, IButterRouterV3 {
    using SafeERC20 for IERC20;
    using Address for address;

    address public bridgeAddress;
    IFeeManager public feeManager;

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
        uint256 toChain;
        uint256 nativeBalance;
        uint256 inputBalance;
    }

    event Approve(address indexed executor, bool indexed flag);
    event SetFeeManager(address indexed _feeManager);
    event ApproveToken(IERC20 token, address spender, uint256 amount);
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

    constructor(
        address _bridgeAddress,
        address _owner,
        address _wToken
    ) payable SwapCallV2(_wToken) FeeManager(_owner) {
        if (!_bridgeAddress.isContract()) revert Errors.NOT_CONTRACT();
        // bridgeAddress = _bridgeAddress;
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

    function approveToken(IERC20 token, address spender, uint256 amount) external onlyOwner {
        token.forceApprove(spender, amount);
        emit ApproveToken(token, spender, amount);
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
        uint256 bridge_len = _bridgeData.length;
        if ((_swapData.length + bridge_len) == 0) revert Errors.DATA_EMPTY();
        SwapTemp memory swapTemp;
        swapTemp.initiator = _initiator;
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;
        swapTemp.transferId = _transferId;
        (swapTemp.nativeBalance, swapTemp.inputBalance) = _transferIn(
            swapTemp.srcToken,
            swapTemp.srcAmount,
            _permitData
        );
        FeeDetail memory fd;
        (fd, swapTemp.swapAmount, swapTemp.referrer) = _collectFee(
            swapTemp.srcToken,
            swapTemp.srcAmount,
            _feeData,
            (bridge_len > 0)
        );
        if (_swapData.length != 0) {
            (swapTemp.swapToken, swapTemp.swapAmount, swapTemp.receiver) = _swap(
                swapTemp.srcToken,
                swapTemp.swapAmount,
                swapTemp.inputBalance,
                _swapData
            );
        }
        bytes memory receiver;
        if (bridge_len == 0) {
            receiver = abi.encodePacked(swapTemp.receiver);
            if (swapTemp.swapAmount != 0) _transfer(swapTemp.swapToken, swapTemp.receiver, swapTemp.swapAmount);
        } else {
            (orderId, swapTemp.toChain, receiver) = _doBridge(
                msg.sender,
                swapTemp.swapToken,
                swapTemp.swapAmount,
                _bridgeData
            );
        }
        if (fd.integratorNativeFee + fd.integratorTokenFee + fd.routerNativeFee + fd.routerTokenFee > 0) {
            // emit when collecting any fee
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
        }

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
        (swapTemp.nativeBalance, swapTemp.inputBalance) = _transferIn(
            swapTemp.srcToken,
            swapTemp.srcAmount,
            _permitData
        );
        if ((_swapData.length + _callbackData.length) == 0) revert Errors.DATA_EMPTY();
        FeeDetail memory fd;
        (fd, swapTemp.swapAmount, swapTemp.referrer) = _collectFee(
            swapTemp.srcToken,
            swapTemp.srcAmount,
            _feeData,
            false
        );
        if (fd.integratorNativeFee + fd.integratorTokenFee + fd.routerNativeFee + fd.routerTokenFee > 0) {
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
        }
        (
            swapTemp.receiver,
            swapTemp.target,
            swapTemp.swapToken,
            swapTemp.swapAmount,
            swapTemp.callAmount
        ) = _doSwapAndCall(swapTemp.srcToken, swapTemp.swapAmount, swapTemp.inputBalance, _swapData, _callbackData);

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

    function getFeeBridge(
        address _inputToken,
        uint256 _inputAmount,
        bytes calldata _feeData
    ) external view returns (address feeToken, uint256 tokenFee, uint256 nativeFee, uint256 afterFeeAmount) {
        IFeeManager.FeeDetail memory fd = _getFee(_inputToken, _inputAmount, _feeData, true);
        feeToken = fd.feeToken;
        (tokenFee, nativeFee, afterFeeAmount) = _calculateFee(_inputToken, _inputAmount, fd);
    }

    function getFee(
        address _inputToken,
        uint256 _inputAmount,
        bytes calldata _feeData
    ) external view override returns (address feeToken, uint256 tokenFee, uint256 nativeFee, uint256 afterFeeAmount) {
        IFeeManager.FeeDetail memory fd = _getFee(_inputToken, _inputAmount, _feeData, false);
        feeToken = fd.feeToken;
        (tokenFee, nativeFee, afterFeeAmount) = _calculateFee(_inputToken, _inputAmount, fd);
    }

    function _calculateFee(
        address _inputToken,
        uint256 _inputAmount,
        IFeeManager.FeeDetail memory fd
    ) internal pure returns (uint256 tokenFee, uint256 nativeFee, uint256 afterFeeAmount) {
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
        bytes calldata _feeData,
        bool bridge
    ) internal view returns (FeeDetail memory fd) {
        if (bridge || address(feeManager) == ZERO_ADDRESS) {
            fd = _getFeeDetailInternal(_inputToken, _inputAmount, _feeData);
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

    function _doSwapAndCall(
        address _srcToken,
        uint256 _amount,
        uint256 _initBalance,
        bytes calldata _swapData,
        bytes calldata _callbackData
    ) internal returns (address receiver, address target, address dstToken, uint256 swapOutAmount, uint256 callAmount) {
        swapOutAmount = _amount;
        dstToken = _srcToken;
        if (_swapData.length > 0) {
            (dstToken, swapOutAmount, receiver) = _swap(_srcToken, _amount, _initBalance, _swapData);
        }
        if (_callbackData.length > 0) {
            (callAmount, receiver, target) = _callBack(swapOutAmount, dstToken, _callbackData);
        }
    }

    function _doBridge(
        address _sender,
        address _token,
        uint256 _amount,
        bytes calldata _bridgeData
    ) internal returns (bytes32 orderId, uint256 toChain, bytes memory receiver) {
        BridgeParam memory _bridge = abi.decode(_bridgeData, (BridgeParam));
        toChain = _bridge.toChain;
        receiver = _bridge.receiver;
        address bridge = bridgeAddress;
        // not approve (approved by function approveToken)
        //uint256 value = _bridge.nativeFee + _approveToken(_token, bridge, _amount);
        uint256 value = _isNative(_token) ? (_bridge.nativeFee + _amount) : _bridge.nativeFee;
        orderId = IButterBridgeV3(bridge).swapOutToken{value: value}(
            _sender,
            _token,
            receiver,
            _amount,
            toChain,
            _bridge.data
        );
    }

    function _collectFee(
        address _token,
        uint256 _amount,
        bytes calldata _feeData,
        bool bridge
    ) internal returns (FeeDetail memory fd, uint256 remain, address referrer) {
        fd = _getFee(_token, _amount, _feeData, bridge);
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

     function _setBridgeAddress(address _bridgeAddress) internal {
         if (!_bridgeAddress.isContract()) revert Errors.NOT_CONTRACT();
         bridgeAddress = _bridgeAddress;
         emit SetBridgeAddress(_bridgeAddress);
     }

    function _transferIn(
        address token,
        uint256 amount,
        bytes calldata permitData
    ) internal returns (uint256 nativeBalanceBeforeExec, uint256 initInputTokenBalance) {
        if (amount == 0) revert Errors.ZERO_IN();
        address self = address(this);
        if (permitData.length != 0) {
            _permit(permitData);
        }
        nativeBalanceBeforeExec = self.balance - msg.value;
        if (_isNative(token)) {
            if (msg.value < amount) revert Errors.FEE_MISMATCH();
            //extra value maybe used for call native or bridge native fee
            initInputTokenBalance = self.balance - amount;
        } else {
            initInputTokenBalance = _getBalance(token, self);
            SafeERC20.safeTransferFrom(IERC20(token), msg.sender, self, amount);
        }
    }

    function _permit(bytes calldata _data) internal {
        (
            address token,
            address owner,
            address spender,
            uint256 value,
            uint256 deadline,
            uint8 v,
            bytes32 r,
            bytes32 s
        ) = abi.decode(_data, (address, address, address, uint256, uint256, uint8, bytes32, bytes32));

        SafeERC20.safePermit(IERC20Permit(token), owner, spender, value, deadline, v, r, s);
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        _transfer(_token, msg.sender, _amount);
    }

    receive() external payable {}
}
