// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./LibAsset.sol";
contract Validatable {

    struct BridgeData {
        bytes32 transactionId;
        string bridge;
        address integrator;
        address referrer;
        address sendingAssetId;
        address receivingAssetId;
        address receiver;
        address refundee;
        uint256 minAmount;
        uint256 destinationChainId;
        bool hasSourceSwaps;
        bool hasDestinationCall;
    }

    modifier validateBridgeData(BridgeData memory _bridgeData) {
        require(_bridgeData.receiver != address(0),"E01");
        require(_bridgeData.minAmount > 0,"EO2");
        require(_bridgeData.destinationChainId != block.chainid,"E03");

        _;
    }

    modifier noNativeAsset(BridgeData memory _bridgeData) {
        require(!LibAsset._isNative(_bridgeData.sendingAssetId),"E04");
        _;
    }

    modifier onlyAllowSourceToken(
        BridgeData memory _bridgeData,
        address _token
    ) {
        require(_bridgeData.sendingAssetId == _token,"E05");
        _;
    }

    modifier onlyAllowDestinationChain(BridgeData memory _bridgeData,uint256 _chainId) {
        require(_bridgeData.destinationChainId == _chainId,"E06");
        _;
    }

    modifier containsSourceSwaps(BridgeData memory _bridgeData) {
       require(_bridgeData.hasSourceSwaps,"E07");
        _;
    }

    modifier doesNotContainSourceSwaps(BridgeData memory _bridgeData) {
        require(!_bridgeData.hasSourceSwaps,"E08");
        _;
    }

    modifier doesNotContainDestinationCalls(BridgeData memory _bridgeData) {
        require(!_bridgeData.hasDestinationCall,"E09");
        _;
    }
}