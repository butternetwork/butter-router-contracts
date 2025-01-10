// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@butternetwork/bridge/contracts/interface/IButterReceiver.sol";
import "./abstract/SwapCall.sol";

contract Receiver is Ownable2Step, SwapCall, ReentrancyGuard, IButterReceiver {
    using SafeERC20 for IERC20;
    using Address for address;

    address public bridgeAddress;
    uint256 public gasForReFund = 80000;

    mapping(address => bool) public keepers;
    mapping(bytes32 => bytes32) public storedFailedSwap;

    error ONLY_KEEPER();
    error INVALID_EXEC_PARAM();

    // use to solve deep stack
    struct SwapTemp {
        address srcToken;
        address swapToken;
        uint256 srcAmount;
        uint256 swapAmount;
        address receiver;
        address target;
        uint256 callAmount;
        uint256 fromChain;
        uint256 toChain;
        uint256 nativeBalance;
        uint256 inputBalance;
        bytes from;
    }

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

    event SwapRescueFunds(
        bytes32 indexed orderId,
        address indexed token,
        address indexed receiver,
        uint256 amount,
        uint256 fromChain,
        uint256 toChain,
        bytes from
    );

    event Approve(address indexed executor, bool indexed flag);
    event SetBridgeAddress(address indexed _bridgeAddress);
    event SetGasForReFund(uint256 indexed _gasForReFund);
    event UpdateKeepers(address _keeper, bool _flag);

    constructor(address _owner, address _wToken, address _bridgeAddress) payable SwapCall(_wToken) {
        if (_owner == address(0)) revert Errors.ZERO_ADDRESS();
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

    function updateKeepers(address _keeper, bool _flag) external onlyOwner {
        if (_keeper == address(0)) revert Errors.ZERO_ADDRESS();
        keepers[_keeper] = _flag;
        emit UpdateKeepers(_keeper, _flag);
    }

    function setBridgeAddress(address _bridgeAddress) public onlyOwner returns (bool) {
        _setBridgeAddress(_bridgeAddress);
        return true;
    }

    function setGasForReFund(uint256 _gasForReFund) external onlyOwner {
        gasForReFund = _gasForReFund;
        emit SetGasForReFund(_gasForReFund);
    }

    function setWToken(address _wToken) external onlyOwner {
        _setWToken(_wToken);
    }

    function editFuncBlackList(bytes4 _func, bool _flag) external onlyOwner {
        _editFuncBlackList(_func, _flag);
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
        if (msg.sender != bridgeAddress) revert Errors.BRIDGE_ONLY();

        (bytes memory _swapData, bytes memory _callbackData) = abi.decode(_swapAndCall, (bytes, bytes));
        if ((_swapData.length + _callbackData.length) == 0) revert Errors.DATA_EMPTY();

        SwapTemp memory swapTemp = _assignment(_fromChain, _srcToken, _amount, _from);
        (swapTemp.nativeBalance, swapTemp.inputBalance) = _checkBalance(swapTemp.srcAmount, swapTemp.srcToken);

        uint256 minExecGas = gasForReFund;
        if (_swapData.length > 0) {
            SwapParam memory swap = abi.decode(_swapData, (SwapParam));
            swapTemp.receiver = swap.receiver;
            bool needStore = true;
            if (gasleft() > minExecGas) {
                try
                    this.remoteSwap{gas: (gasleft() - minExecGas)}(
                        swapTemp.srcToken,
                        swapTemp.srcAmount,
                        swapTemp.inputBalance,
                        swap
                    )
                returns (address dstToken, uint256 dstAmount) {
                    swapTemp.swapToken = dstToken;
                    swapTemp.swapAmount = dstAmount;
                    needStore = false;
                } catch {}
            }
            if (needStore) {
                _store(
                    _orderId,
                    swapTemp.fromChain,
                    swapTemp.srcToken,
                    swap.dstToken,
                    swapTemp.srcAmount,
                    swap.receiver,
                    swap.minAmount,
                    swapTemp.from,
                    _callbackData
                );
                return;
            }
        }

        if (_callbackData.length > 0) {
            CallbackParam memory callParam = abi.decode(_callbackData, (CallbackParam));
            if (swapTemp.receiver == address(0)) {
                swapTemp.receiver = callParam.receiver;
            }
            if (gasleft() > minExecGas) {
                try
                    this.remoteCall{gas: (gasleft() - minExecGas)}(callParam, swapTemp.swapToken, swapTemp.swapAmount)
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

        _afterCheck(swapTemp.nativeBalance);
        _emitRemoteSwapAndCall(_orderId, swapTemp);
    }

    function swapRescueFunds(
        bytes32 _orderId,
        uint256 _fromChain,
        address _srcToken,
        uint256 _amount,
        address _dscToken,
        address _receiver,
        bytes calldata _from,
        bytes calldata _callbackData
    ) external nonReentrant {
        if (!keepers[msg.sender]) revert ONLY_KEEPER();
        require(_receiver != address(0));
        SwapTemp memory swapTemp = _assignment(_fromChain, _srcToken, _amount, _from);
        swapTemp.receiver = _receiver;
        bytes32 hash = keccak256(
            abi.encodePacked(
                swapTemp.fromChain,
                swapTemp.srcToken,
                _dscToken,
                swapTemp.srcAmount,
                swapTemp.receiver,
                swapTemp.from,
                _callbackData
            )
        );
        if (storedFailedSwap[_orderId] != hash) revert INVALID_EXEC_PARAM();
        _transfer(swapTemp.srcToken, swapTemp.receiver, swapTemp.srcAmount);
        delete storedFailedSwap[_orderId];
        emit SwapRescueFunds(
            _orderId,
            swapTemp.srcToken,
            swapTemp.receiver,
            swapTemp.srcAmount,
            swapTemp.fromChain,
            swapTemp.toChain,
            swapTemp.from
        );
    }

    function execSwap(
        bytes32 _orderId,
        uint256 _fromChain,
        address _srcToken,
        uint256 _amount,
        bytes calldata _from,
        bytes calldata _swapData,
        bytes calldata _callbackData
    ) external nonReentrant {
        if (!keepers[msg.sender]) revert ONLY_KEEPER();
        if (_swapData.length == 0) revert Errors.DATA_EMPTY();

        SwapTemp memory swapTemp = _assignment(_fromChain, _srcToken, _amount, _from);

        SwapParam memory swap = abi.decode(_swapData, (SwapParam));
        swapTemp.receiver = swap.receiver;

        bytes32 hash = keccak256(
            abi.encodePacked(
                swapTemp.fromChain,
                swapTemp.srcToken,
                swap.dstToken,
                swapTemp.srcAmount,
                swapTemp.receiver,
                swapTemp.from,
                _callbackData
            )
        );
        if (storedFailedSwap[_orderId] != hash) revert INVALID_EXEC_PARAM();

        (swapTemp.nativeBalance, swapTemp.inputBalance) = _checkBalance(swapTemp.srcAmount, swapTemp.srcToken);

        (swapTemp.swapToken, swapTemp.swapAmount) = _swap(
            swapTemp.srcToken,
            swapTemp.srcAmount,
            swapTemp.inputBalance,
            swap
        );

        if (_callbackData.length > 0) {
            uint256 minExecGas = gasForReFund;
            CallbackParam memory callParam = abi.decode(_callbackData, (CallbackParam));
            if (gasleft() > minExecGas) {
                try
                    this.remoteCall{gas: (gasleft() - minExecGas)}(callParam, swapTemp.swapToken, swapTemp.swapAmount)
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
        _afterCheck(swapTemp.nativeBalance);
        delete storedFailedSwap[_orderId];
        _emitRemoteSwapAndCall(_orderId, swapTemp);
    }

    function _assignment(
        uint256 _fromChain,
        address _srcToken,
        uint256 _amount,
        bytes calldata _from
    ) private view returns (SwapTemp memory swapTemp) {
        swapTemp.srcToken = _srcToken;
        swapTemp.srcAmount = _amount;
        swapTemp.swapToken = _srcToken;
        swapTemp.swapAmount = _amount;
        swapTemp.fromChain = _fromChain;
        swapTemp.toChain = block.chainid;
        swapTemp.from = _from;
    }

    function _emitRemoteSwapAndCall(bytes32 _orderId, SwapTemp memory swapTemp) private {
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

    function _checkBalance(
        uint256 _amount,
        address _srcToken
    ) private view returns (uint256 nativeBalance, uint256 inputBalance) {
        uint256 balance = _getBalance(_srcToken, address(this));
        if (balance < _amount) revert Errors.RECEIVE_LOW();
        nativeBalance = address(this).balance;
        inputBalance = balance - _amount;
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

    event SwapFailed(
        bytes32 indexed _orderId,
        uint256 _fromChain,
        address _srcToken,
        address _dscToken,
        uint256 _amount,
        address _receiver,
        uint256 _minReceived,
        bytes _from,
        bytes _callData
    );

    function _store(
        bytes32 _orderId,
        uint256 _fromChain,
        address _srcToken,
        address _dstToken,
        uint256 _amount,
        address _receiver,
        uint256 _minReceived,
        bytes memory _from,
        bytes memory _callbackData
    ) private {
        bytes32 hash = keccak256(
            abi.encodePacked(_fromChain, _srcToken, _dstToken, _amount, _receiver, _from, _callbackData)
        );
        storedFailedSwap[_orderId] = hash;
        emit SwapFailed(_orderId, _fromChain, _srcToken, _dstToken, _amount, _receiver, _minReceived, _from, _callbackData);
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
