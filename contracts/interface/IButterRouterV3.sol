// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IButterRouterV3
 * @notice Interface for Butter Network Router V3 - Cross-chain swap and bridge aggregator
 * @dev This interface defines the core functionality for token swapping, cross-chain bridging,
 *      and callback execution within the Butter Network ecosystem
 */
interface IButterRouterV3 {
    /**
     * @notice Enumeration of fee calculation types
     * @dev FIXED: A fixed amount native token fee regardless of transaction size
     *      PROPORTION: A percentage-based fee calculated from transaction amount
     */
    enum FeeType {
        FIXED,      // Fixed fee amount
        PROPORTION  // Proportional fee based on transaction amount
    }

    /**
     * @notice Fee configuration structure for referrer/integrator fees
     * @param feeType Type of fee calculation (FIXED or PROPORTION)
     * @param referrer Address of the referrer/integrator who will receive the fee
     * @param rateOrNativeFee Fee rate (for PROPORTION) or fixed native fee amount (for FIXED)
     */
    struct Fee {
        FeeType feeType;        // Fee calculation method
        address referrer;       // Referrer/integrator address
        uint256 rateOrNativeFee; // Fee rate (basis points) or fixed amount
    }

    /**
     * @notice Bridge parameters for cross-chain operations
     * @param toChain Destination chain ID for cross-chain transfer
     * @param nativeFee Native token fee required for bridge operation
     * @param receiver Encoded receiver address on destination chain
     * @param data Additional bridge-specific data for cross-chain execution
     */
    struct BridgeParam {
        uint256 toChain;    // Target blockchain chain ID
        uint256 nativeFee;  // Bridge fee in native tokens
        bytes receiver;     // Destination address (encoded)
        bytes data;         // Bridge-specific execution data
    }

    /**
     * @notice Emitted when tokens are swapped and bridged to another chain
     * @param referrer Address of the referrer/integrator
     * @param initiator Address that initiated the transaction
     * @param from Address that sent the tokens
     * @param transferId Unique identifier for the transfer
     * @param orderId Bridge order ID returned from bridge contract
     * @param originToken Address of the original input token
     * @param bridgeToken Address of the token being bridged
     * @param originAmount Amount of original tokens input
     * @param bridgeAmount Amount of tokens being bridged
     * @param toChain Destination chain ID
     * @param to Encoded receiver address on destination chain
     */
    event SwapAndBridge(
        address indexed referrer,
        address indexed initiator,
        address indexed from,
        bytes32 transferId,
        bytes32 orderId,
        address originToken,
        address bridgeToken,
        uint256 originAmount,
        uint256 bridgeAmount,
        uint256 toChain,
        bytes to
    );

    /**
     * @notice Emitted when tokens are swapped and a callback is executed
     * @param referrer Address of the referrer/integrator
     * @param initiator Address that initiated the transaction
     * @param from Address that sent the tokens
     * @param transferId Unique identifier for the transfer
     * @param originToken Address of the original input token
     * @param swapToken Address of the token received from swap
     * @param originAmount Amount of original tokens input
     * @param swapAmount Amount of tokens received from swap
     * @param receiver Address that will receive remaining tokens
     * @param target Address of the contract called for callback
     * @param callAmount Amount of tokens used in the callback
     */
    event SwapAndCall(
        address indexed referrer,
        address indexed initiator,
        address indexed from,
        bytes32 transferId,
        address originToken,
        address swapToken,
        uint256 originAmount,
        uint256 swapAmount,
        address receiver,
        address target,
        uint256 callAmount
    );

    /**
     * @notice Emitted when a remote swap and call is executed (from bridge)
     * @param orderId Bridge order ID that triggered this execution
     * @param receiver Address that will receive remaining tokens
     * @param target Address of the contract called for callback
     * @param originToken Address of the original bridged token
     * @param swapToken Address of the token received from swap
     * @param originAmount Amount of original bridged tokens
     * @param swapAmount Amount of tokens received from swap
     * @param callAmount Amount of tokens used in the callback
     * @param fromChain Source chain ID where tokens were bridged from
     * @param toChain Current chain ID where execution is happening
     * @param from Encoded address that initiated the bridge on source chain
     */
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

    /**
     * @notice Executes token swap and optional callback function
     * @dev Supports two operations:
     *      1. Pure swap: _swapData.length > 0 and _callbackData.length == 0
     *      2. Swap and call: _swapData.length > 0 and _callbackData.length > 0
     * @param _transferId Unique identifier for this transfer
     * @param _initiator Address that initiated this transaction
     * @param _srcToken Address of the source token to swap from
     * @param _amount Amount of source tokens to swap
     * @param _swapData Encoded swap parameters (SwapParam struct)
     * @param _callbackData Encoded callback parameters (CallbackParam struct), empty for pure swap
     * @param _permitData EIP-2612 permit signature data for gasless approval (optional)
     * @param _feeData Encoded fee configuration (Fee struct)
     */
    function swapAndCall(
        bytes32 _transferId,
        address _initiator,
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _callbackData,
        bytes calldata _permitData,
        bytes calldata _feeData
    ) external payable;

    /**
     * @notice Executes token swap and cross-chain bridge operation
     * @dev Supports two operations:
     *      1. Pure bridge: _swapData.length == 0 and _bridgeData.length > 0
     *      2. Swap and bridge: _swapData.length > 0 and _bridgeData.length > 0
     * @param _transferId Unique identifier for this transfer
     * @param _initiator Address that initiated this transaction
     * @param _srcToken Address of the source token to swap from
     * @param _amount Amount of source tokens to process
     * @param _swapData Encoded swap parameters (SwapParam struct), empty for pure bridge
     * @param _bridgeData Encoded bridge parameters (BridgeParam struct)
     * @param _permitData EIP-2612 permit signature data for gasless approval (optional)
     * @param _feeData Encoded fee configuration (Fee struct)
     * @return orderId Unique bridge order ID returned from bridge contract
     */
    function swapAndBridge(
        bytes32 _transferId,
        address _initiator,
        address _srcToken,
        uint256 _amount,
        bytes calldata _swapData,
        bytes calldata _bridgeData,
        bytes calldata _permitData,
        bytes calldata _feeData
    ) external payable returns (bytes32 orderId);

    /**
     * @notice Calculates fees for a given transaction
     * @param _inputToken Address of the input token
     * @param _inputAmount Amount of input tokens
     * @param _feeData Encoded fee configuration (Fee struct)
     * @return feeToken Address of the token used for fee payment
     * @return tokenFee Amount of token fees to be charged
     * @return nativeFee Amount of native token fees to be charged
     * @return afterFeeAmount Amount remaining after fee deduction
     */
    function getFee(
        address _inputToken,
        uint256 _inputAmount,
        bytes calldata _feeData
    ) external view returns (address feeToken, uint256 tokenFee, uint256 nativeFee, uint256 afterFeeAmount);

    /**
     * @notice Calculates the required input amount to achieve a desired output after fees
     * @param _inputToken Address of the input token
     * @param _afterFeeAmount Desired amount after fee deduction
     * @param _feeData Encoded fee configuration (Fee struct)
     * @return feeToken Address of the token used for fee payment
     * @return inputAmount Required input amount to achieve desired output
     * @return nativeFee Amount of native token fees required
     */
    function getInputBeforeFee(
        address _inputToken,
        uint256 _afterFeeAmount,
        bytes calldata _feeData
    ) external view returns (address feeToken, uint256 inputAmount, uint256 nativeFee);
}
