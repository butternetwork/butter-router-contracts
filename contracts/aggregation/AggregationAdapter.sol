
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interface/IStargateRouter.sol";
import "./interface/IXSwapper.sol";
import "./interface/ISymbiosisMetaRouter.sol";
import "./lib/Swapper.sol";
import "./lib/LibAsset.sol";
import "./lib/Validatable.sol";
// import "hardhat/console.sol";


interface  IRubicFee {
    function calcTokenFees(uint256 _amount,address _integrator)external view returns (uint256 totalFee, uint256 RubicFee, uint256 integratorFee);
}

// Be careful this contract contains unsafe call !.
// Do not approve token or just approve the right amount before call it.
// Clear approve in the same transaction if calling failed.
contract AggregationAdaptor is ReentrancyGuard,Ownable2Step,Swapper,Validatable{

    address  rubicProxy = 0x6AA981bFF95eDfea36Bdae98C26B274FfcafE8d3;
    ISymbiosisMetaRouter public  symbiosisMetaRouter;
    address public  symbiosisGateway;
    IStargateRouter public  stargateRouter;
    IXSwapper public  xRouter;
   
    /// @param router Address of the router that has to be called
    /// @param callData Calldata that has to be passed to the router
    struct GenericCrossChainData {
        address router;
        bytes callData;
    }
    event  TransferStarted(BridgeData bridgeData);
    event  SetRouters(address indexed _symbiosisMetaRouter,address indexed _stargateRouter,address indexed _xRouter,address _symbiosisGateway);
    event  SetRubicProxy(address indexed _rubicProxy);

    constructor(address _owner) payable {
       _transferOwnership(_owner);
    }

    function setRouters(ISymbiosisMetaRouter _symbiosisMetaRouter,address _symbiosisGateway,IStargateRouter _stargateRouter,IXSwapper _xRouter) external onlyOwner {
        symbiosisMetaRouter = _symbiosisMetaRouter;
        symbiosisGateway = _symbiosisGateway;
        stargateRouter = _stargateRouter;
        xRouter = _xRouter;
        emit SetRouters(address(_symbiosisMetaRouter),address(_stargateRouter),address(_xRouter),_symbiosisGateway);
    }

    function setRubicProxy(address _rubicProxy) external onlyOwner {
        rubicProxy = _rubicProxy;
        emit SetRubicProxy(_rubicProxy);
    }

    /// @param facetCallData Calldata that should be passed to the diamond
    /// Should contain any cross-chain related function
    function startViaRubic(
        address[] memory,
        uint256[] memory,
        bytes calldata facetCallData
    ) external payable {
      (bool result,bytes memory data) = address(this).delegatecall(facetCallData);
      if (!result) {
                // Next 5 lines from https://ethereum.stackexchange.com/a/83577
                if (data.length < 68) revert();
                assembly {
                    result := add(data, 0x04)
                }
                revert(abi.decode(data, (string)));
            }
    }


//<------------------------------------------------ GenericSwapFacet ------------------------------------->
//<------------------------------------------------ GenericSwapFacet ------------------------------------->

    event SwappedGeneric(
        bytes32 indexed transactionId,
        address integrator,
        address referrer,
        address fromAssetId,
        address toAssetId,
        uint256 fromAmount,
        uint256 toAmount
    );

    /// @notice Performs multiple swaps in one transaction
    /// @param _transactionId the transaction id associated with the operation
    /// @param _integrator the address of the integrator
    /// @param _referrer the address of the referrer
    /// @param _receiver the address to receive the swapped tokens into (also excess tokens)
    /// @param _minAmount the minimum amount of the final asset to receive
    /// @param _swapData an object containing swap related data to perform swaps before bridging
    function swapTokensGeneric(
        bytes32 _transactionId,
        address _integrator,
        address _referrer,
        address payable _receiver,
        uint256 _minAmount,
        LibSwap.SwapData[] calldata _swapData
    ) external payable nonReentrant refundExcessNative(_receiver) {
        require(_receiver != address(0),"E27");
        uint256 postSwapBalance = _depositAndSwap(
            _transactionId,
            _minAmount,
            _swapData,
            _integrator,
            _receiver
        );
        address receivingAssetId = _swapData[_swapData.length - 1].receivingAssetId;
        LibAsset._transfer(receivingAssetId, _receiver, postSwapBalance);
        emit SwappedGeneric(
            _transactionId,
            _integrator,
            _referrer,
            _swapData[0].sendingAssetId,
            receivingAssetId,
            _swapData[0].fromAmount,
            postSwapBalance
        );
    }

//<------------------------------------------------ GenericCrossChainFacet ------------------------------------->
//<------------------------------------------------ GenericCrossChainFacet ------------------------------------->

    struct ProviderFunctionInfo {
        bool isAvailable;
        uint256 offset;
    }
    event SelectorToInfoUpdated(
        address[] _routers,
        bytes4[] _selectors,
        ProviderFunctionInfo[] _infos
    );
    mapping(address => mapping(bytes4 => ProviderFunctionInfo)) selectorToInfo;

    /// @notice Updates the amount offset of the specific function of the specific provider's router
    /// @param _routers Array of provider's routers
    /// @param _selectors Array of function selectors
    /// @param _infos Array of params associated with specified function
    function updateSelectorInfo(
        address[] calldata _routers,
        bytes4[] calldata _selectors,
        ProviderFunctionInfo[] calldata _infos
    ) external onlyOwner {

        require(_routers.length == _selectors.length && _selectors.length == _infos.length);

        for (uint64 i; i < _routers.length; ) {
            selectorToInfo[_routers[i]][_selectors[i]] = _infos[i];
            unchecked {
                ++i;
            }
        }
        emit SelectorToInfoUpdated(_routers,_selectors,_infos);
    }

    /// @notice Bridges tokens via arbitrary cross-chain provider
    /// @param _bridgeData the core information needed for bridging
    /// @param _genericData data specific to GenericCrossChainFacet
    function startBridgeTokensViaGenericCrossChain(
        BridgeData memory _bridgeData,
        GenericCrossChainData calldata _genericData
    )
        external
        payable
        nonReentrant
        refundExcessNative(payable(_bridgeData.refundee))
        validateBridgeData(_bridgeData)
        doesNotContainSourceSwaps(_bridgeData)
        doesNotContainDestinationCalls(_bridgeData)
    {
        depositAsset(_bridgeData.sendingAssetId,_bridgeData.minAmount);

        _startBridgeGeneric(
            _bridgeData,
            _patchGenericCrossChainData(_genericData, _bridgeData.minAmount)
        );
    }

    /// @notice Bridges tokens via arbitrary cross-chain provider with swaps before bridging
    /// @param _bridgeData the core information needed for bridging
    /// @param _swapData an array of swap related data for performing swaps before bridging
    /// @param _genericData data specific to GenericCrossChainFacet
    function swapAndStartBridgeTokensViaGenericCrossChain(
        BridgeData memory _bridgeData,
        LibSwap.SwapData[] calldata _swapData,
        GenericCrossChainData calldata _genericData
    )
        external
        payable
        nonReentrant
        refundExcessNative(payable(_bridgeData.refundee))
        containsSourceSwaps(_bridgeData)
        validateBridgeData(_bridgeData)
    {
        _bridgeData.minAmount = _depositAndSwap(
            _bridgeData.transactionId,
            _bridgeData.minAmount,
            _swapData,
            _bridgeData.integrator,
            payable(_bridgeData.refundee)
        );

        _startBridgeGeneric(
            _bridgeData,
            _patchGenericCrossChainData(_genericData, _bridgeData.minAmount)
        );
    }


    /// @dev Contains the business logic for the bridge via arbitrary cross-chain provider
    /// @param _bridgeData the core information needed for bridging
    /// @param _genericData data specific to GenericCrossChainFacet
    function _startBridgeGeneric(
        BridgeData memory _bridgeData,
        GenericCrossChainData memory _genericData
    ) internal {
        bool isNative = LibAsset._isNative(_bridgeData.sendingAssetId);
        uint256 nativeAssetAmount;

        if (isNative) {
            nativeAssetAmount = _bridgeData.minAmount;
        } else {
            LibAsset._maxApproveERC20(
                IERC20(_bridgeData.sendingAssetId),
                _genericData.router,
                _bridgeData.minAmount
            );
        }
       require(_genericData.router.code.length > 0,"E26");
       (bool success,) = _genericData.router.call{value: nativeAssetAmount}(_genericData.callData);
       require(success,"E20");
        emit TransferStarted(_bridgeData);
    }

     function _patchGenericCrossChainData(
        GenericCrossChainData calldata _genericData,
        uint256 amount
    ) private view returns (GenericCrossChainData memory) {

        ProviderFunctionInfo memory info = selectorToInfo[
            _genericData.router
        ][bytes4(_genericData.callData[:4])];
        require(info.isAvailable,"E21");
         if (info.offset > 0) {
                return
                    GenericCrossChainData(
                        _genericData.router,
                        bytes.concat(
                            _genericData.callData[:info.offset],
                            abi.encode(amount),
                            _genericData.callData[info.offset + 32:]
                        )
                    );
            } else {
                return
                    GenericCrossChainData(
                        _genericData.router,
                        _genericData.callData
                    );
            }
    }


    //<------------------------------------------------ SymbiosisFacet ------------------------------------->
    //<------------------------------------------------ SymbiosisFacet ------------------------------------->


    struct SymbiosisData {
        // TODO: clean data
        bytes firstSwapCalldata;
        bytes secondSwapCalldata;
        address intermediateToken;
        address bridgingToken;
        address firstDexRouter;
        address secondDexRouter;
        address relayRecipient;
        bytes otherSideCalldata;
    }

    /// @notice Bridges tokens via Symbiosis
    /// @param _bridgeData the core information needed for bridging
    /// @param _symbiosisData data specific to Symbiosis
    function startBridgeTokensViaSymbiosis(
        BridgeData memory _bridgeData,
        SymbiosisData calldata _symbiosisData
    )
        external
        payable
        nonReentrant
        refundExcessNative(payable(_bridgeData.refundee))
        validateBridgeData(_bridgeData)
        doesNotContainSourceSwaps(_bridgeData)
        doesNotContainDestinationCalls(_bridgeData)
    {
        depositAsset(_bridgeData.sendingAssetId,_bridgeData.minAmount);
        _startBridgeSymbiosis(_bridgeData, _symbiosisData);
    }

    /// @notice Performs a swap before bridging via Symbiosis
    /// @param _bridgeData the core information needed for bridging
    /// @param _swapData an array of swap related data for performing swaps before bridging
    /// @param _symbiosisData data specific to Symbiosis
    function swapAndStartBridgeTokensViaSymbiosis(
        BridgeData memory _bridgeData,
        LibSwap.SwapData[] calldata _swapData,
        SymbiosisData calldata _symbiosisData
    )
        external
        payable
        nonReentrant
        refundExcessNative(payable(_bridgeData.refundee))
        containsSourceSwaps(_bridgeData)
        validateBridgeData(_bridgeData)
    {
        _bridgeData.minAmount = _depositAndSwap(
            _bridgeData.transactionId,
            _bridgeData.minAmount,
            _swapData,
            _bridgeData.integrator,
            payable(_bridgeData.refundee)
        );

        _startBridgeSymbiosis(_bridgeData, _symbiosisData);
    }

    /// @dev Contains the business logic for the bridge via Symbiosis
    /// @param _bridgeData the core information needed for bridging
    /// @param _symbiosisData data specific to Symbiosis
    function _startBridgeSymbiosis(
        BridgeData memory _bridgeData,
        SymbiosisData calldata _symbiosisData
    ) internal {
        require(address(symbiosisMetaRouter) != address(0),"E23");
        bool isNative = LibAsset._isNative(_bridgeData.sendingAssetId);
        uint256 nativeAssetAmount;

        if (isNative) {
            nativeAssetAmount = _bridgeData.minAmount;
        } else {
            LibAsset._maxApproveERC20(
                IERC20(_bridgeData.sendingAssetId),
                symbiosisGateway,
                _bridgeData.minAmount
            );
        }

        address[] memory approvedTokens = new address[](3);
        approvedTokens[0] = _bridgeData.sendingAssetId;
        approvedTokens[1] = _symbiosisData.intermediateToken;
        approvedTokens[2] = _symbiosisData.bridgingToken;
 
        symbiosisMetaRouter.metaRoute{ value: nativeAssetAmount }(
            ISymbiosisMetaRouter.MetaRouteTransaction(
                _symbiosisData.firstSwapCalldata,
                _symbiosisData.secondSwapCalldata,
                approvedTokens,
                _symbiosisData.firstDexRouter,
                _symbiosisData.secondDexRouter,
                _bridgeData.minAmount,
                isNative,
                _symbiosisData.relayRecipient,
                _symbiosisData.otherSideCalldata
            )
        );
        emit TransferStarted(_bridgeData);
    }

    //<------------------------------------------------ XYFacet ------------------------------------->
   //<------------------------------------------------ XYFacet ------------------------------------->
    struct XYData {
        address toChainToken;
        uint256 expectedToChainTokenAmount;
        uint32 slippage;
    }


    /// @notice Bridges tokens via XY
    /// @param _bridgeData the core information needed for bridging
    /// @param _xyData data specific to XY
    function startBridgeTokensViaXY(
        BridgeData memory _bridgeData,
        XYData calldata _xyData
    )
        external
        payable
        nonReentrant
        refundExcessNative(payable(_bridgeData.refundee))
        validateBridgeData(_bridgeData)
        doesNotContainSourceSwaps(_bridgeData)
        doesNotContainDestinationCalls(_bridgeData)
    {   
        depositAsset(_bridgeData.sendingAssetId,_bridgeData.minAmount);
        _startBridgeXY(_bridgeData, _xyData);
    }

    /// @notice Performs a swap before bridging via XY
    /// @param _bridgeData the core information needed for bridging
    /// @param _swapData an array of swap related data for performing swaps before bridging
    /// @param _xyData data specific to XY
    function swapAndStartBridgeTokensViaXY(
        BridgeData memory _bridgeData,
        LibSwap.SwapData[] calldata _swapData,
        XYData calldata _xyData
    )
        external
        payable
        nonReentrant
        refundExcessNative(payable(_bridgeData.refundee))
        containsSourceSwaps(_bridgeData)
        validateBridgeData(_bridgeData)
    {
        _bridgeData.minAmount = _depositAndSwap(
            _bridgeData.transactionId,
            _bridgeData.minAmount,
            _swapData,
            _bridgeData.integrator,
            payable(_bridgeData.refundee)
        );

        _startBridgeXY(_bridgeData, _xyData);
    }

    /// @dev Contains the business logic for the bridge via XY
    /// @param _bridgeData the core information needed for bridging
    /// @param _xyData data specific to XY
    function _startBridgeXY(
        BridgeData memory _bridgeData,
        XYData calldata _xyData
    ) internal {
        require(address(xRouter) != address(0),"E24");
        bool isNative = LibAsset._isNative(_bridgeData.sendingAssetId);
        uint256 nativeAssetAmount;

        if (isNative) {
            nativeAssetAmount = _bridgeData.minAmount;
            _bridgeData.sendingAssetId = LibAsset.NATIVE_ADDRESS;
        } else {
            LibAsset._maxApproveERC20(
                IERC20(_bridgeData.sendingAssetId),
                address(xRouter),
                _bridgeData.minAmount
            );
        }

        address toChainToken = _xyData.toChainToken;
        if (LibAsset._isNative(toChainToken))
            toChainToken = LibAsset.NATIVE_ADDRESS;

        xRouter.swap{ value: nativeAssetAmount }(
            address(0),
            IXSwapper.SwapDescription(
                _bridgeData.sendingAssetId,
                _bridgeData.sendingAssetId,
                _bridgeData.receiver,
                _bridgeData.minAmount,
                _bridgeData.minAmount
            ),
            "",
            IXSwapper.ToChainDescription(
                uint32(_bridgeData.destinationChainId),
                toChainToken,
                _xyData.expectedToChainTokenAmount,
                _xyData.slippage
            )
        );

        if (isNative) {
            _bridgeData.sendingAssetId = address(0);
        }

        emit TransferStarted(_bridgeData);

    }



    //<------------------------------------------------ Stargate ------------------------------------->
    //<------------------------------------------------ Stargate ------------------------------------->

    mapping(address => uint16) stargatePoolId;
    mapping(uint256 => uint16) layerZeroChainId;


    /// @param dstPoolId Dest pool id.
    /// @param minAmountLD The min qty you would accept on the destination.
    /// @param dstGasForCall Additional gas fee for extral call on the destination.
    /// @param refundAddress Refund adddress. Extra gas (if any) is returned to this address
    /// @param lzFee Estimated message fee.
    /// @param callTo The address to send the tokens to on the destination.
    /// @param callData Additional payload.
    struct StargateData {
        uint256 dstPoolId;
        uint256 minAmountLD;
        uint256 dstGasForCall;
        uint256 lzFee;
        address payable refundAddress;
        bytes callTo;
        bytes callData;
    }

    /// @notice Bridges tokens via Stargate Bridge
    /// @param _bridgeData Data used purely for tracking and analytics
    /// @param _stargateData Data specific to Stargate Bridge
    function startBridgeTokensViaStargate(
        BridgeData memory _bridgeData,
        StargateData calldata _stargateData
    )
        external
        payable
        nonReentrant
        refundExcessNative(payable(_bridgeData.refundee))
        doesNotContainSourceSwaps(_bridgeData)
        validateBridgeData(_bridgeData)
        noNativeAsset(_bridgeData)
    {
        validateDestinationCallFlag(_bridgeData, _stargateData);
        depositAsset(_bridgeData.sendingAssetId,_bridgeData.minAmount);
        _startBridgeStargate(_bridgeData, _stargateData);
    }

    /// @notice Performs a swap before bridging via Stargate Bridge
    /// @param _bridgeData Data used purely for tracking and analytics
    /// @param _swapData An array of swap related data for performing swaps before bridging
    /// @param _stargateData Data specific to Stargate Bridge
    function swapAndStartBridgeTokensViaStargate(
        BridgeData memory _bridgeData,
        LibSwap.SwapData[] calldata _swapData,
        StargateData calldata _stargateData
    )
        external
        payable
        nonReentrant
        refundExcessNative(payable(_bridgeData.refundee))
        containsSourceSwaps(_bridgeData)
        validateBridgeData(_bridgeData)
        noNativeAsset(_bridgeData)
    {
        validateDestinationCallFlag(_bridgeData, _stargateData);
        _bridgeData.minAmount = _depositAndSwap(
            _bridgeData.transactionId,
            _bridgeData.minAmount,
            _swapData,
            _bridgeData.integrator,
            payable(_bridgeData.refundee),
            _stargateData.lzFee
        );

        _startBridgeStargate(_bridgeData, _stargateData);
    }

    function quoteLayerZeroFee(
        uint256 _destinationChainId,
        StargateData calldata _stargateData
    ) external view returns (uint256, uint256) {
        return
            stargateRouter.quoteLayerZeroFee(
                getLayerZeroChainId(_destinationChainId),
                1, // TYPE_SWAP_REMOTE on Bridge
                _stargateData.callTo,
                _stargateData.callData,
                IStargateRouter.lzTxObj(
                    _stargateData.dstGasForCall,
                    0,
                    toBytes(msg.sender)
                )
            );
    }


    /// @dev Contains the business logic for the bridge via Stargate Bridge
    /// @param _bridgeData Data used purely for tracking and analytics
    /// @param _stargateData Data specific to Stargate Bridge
    function _startBridgeStargate(
        BridgeData memory _bridgeData,
        StargateData calldata _stargateData
    ) private noNativeAsset(_bridgeData) {
        require(address(stargateRouter) != address(0),"E25");
        LibAsset._maxApproveERC20(
            IERC20(_bridgeData.sendingAssetId),
            address(stargateRouter),
            _bridgeData.minAmount
        );

        stargateRouter.swap{ value: _stargateData.lzFee }(
            getLayerZeroChainId(_bridgeData.destinationChainId),
            getStargatePoolId(_bridgeData.sendingAssetId),
            _stargateData.dstPoolId,
            _stargateData.refundAddress,
            _bridgeData.minAmount,
            _stargateData.minAmountLD,
            IStargateRouter.lzTxObj(
                _stargateData.dstGasForCall,
                0,
                toBytes(_bridgeData.receiver)
            ),
            _stargateData.callTo,
            _stargateData.callData
        );
    }

    function validateDestinationCallFlag(
        BridgeData memory _bridgeData,
        StargateData calldata _stargateData
    ) private pure {
        require((_stargateData.callData.length > 0) == _bridgeData.hasDestinationCall,"");
    }

    event SetStargatePoolIds(PoolIdConfig[] _poolIds);
    struct PoolIdConfig {
        address token;
        uint16 poolId;
    }
    function setStargatePoolId(PoolIdConfig[] calldata _poolIds) external onlyOwner{
        for(uint256 i = 0; i < _poolIds.length; i++){
          stargatePoolId[_poolIds[i].token] = _poolIds[i].poolId;
        }
        emit SetStargatePoolIds(_poolIds);
    }

    event SetLayerZeroChainId(ChainIdConfig[] _chainIds);

    struct ChainIdConfig {
        uint256 chainId;
        uint16 layerZeroChainId;
    }
    function setLayerZeroChainId(ChainIdConfig[] calldata _chainIds) external onlyOwner{
        for(uint256 i = 0; i < _chainIds.length; i++){
          layerZeroChainId[_chainIds[i].chainId] = _chainIds[i].layerZeroChainId;
        }
        emit SetLayerZeroChainId(_chainIds);
    }

    /// @notice Gets the Stargate pool ID for a given token
    /// @param _token address of the token
    /// @return uint256 of the Stargate pool ID
    function getStargatePoolId(address _token) private view returns (uint16) {
        uint16 poolId = stargatePoolId[_token];
        require(poolId != 0);
        return poolId;
    }

    /// @notice Gets the Layer 0 chain ID for a given chain ID
    /// @param _chainId uint256 of the chain ID
    /// @return uint16 of the Layer 0 chain ID
    function getLayerZeroChainId(
        uint256 _chainId
    ) private view returns (uint16) {
        uint16 chainId = layerZeroChainId[_chainId];
        require(chainId != 0) ;
        return chainId;
    }

    function toBytes(address _address) private pure returns (bytes memory) {
        bytes memory tempBytes;

        assembly {
            let m := mload(0x40)
            _address := and(
                _address,
                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
            )
            mstore(
                add(m, 20),
                xor(0x140000000000000000000000000000000000000000, _address)
            )
            mstore(0x40, add(m, 52))
            tempBytes := m
        }

        return tempBytes;
    }

    function authentication(address assetId,address _approveTo,address _callTo,bytes4 sig) public override returns(bool){
           return true;
    }

    
    function calcTokenFees(uint256 _amount,address _integrator)public view override returns (uint256 totalFee){
        if(rubicProxy.code.length == 0){
           totalFee = 0; 
        } else {
           (totalFee,,) = IRubicFee(rubicProxy).calcTokenFees(_amount,_integrator);
        }
    }

    function rescueFunds(address _token, uint256 _amount) external onlyOwner {
        LibAsset._transfer(_token,msg.sender,_amount);
    }
}