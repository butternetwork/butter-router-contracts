

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./SafeMath.sol";


library TransferHelper {
    using SafeMath for uint256;

    function safeApprove(
        address token,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('approve(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x095ea7b3, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::safeApprove: approve failed'
        );
    }

    function safeTransfer(
        address token,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('transfer(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::safeTransfer: transfer failed'
        );
    }

    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::transferFrom: transferFrom failed'
        );
    }
    
    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'TransferHelper::safeTransferETH: ETH transfer failed');
    }
    
    
    function HelpRoyalties(address nftaddress, uint256 tokenId,uint256 _value) external view returns(address,uint256){
        
       (bool success, bytes memory data) =  nftaddress.staticcall(abi.encodeWithSignature("royaltyInfo(uint256,uint256)",tokenId,_value));
       
      if(success && data.length == 64){
          
          (address addr1,uint256 value1)=abi.decode(data, (address,uint256));
          if(addr1 != address(0) && value1 > 0 && value1 <= _value.mul(50).div(100)) {
               
                return( addr1,value1);
          }else if(value1 > _value.mul(50).div(100)){
              
              return (addr1,_value.mul(50).div(100));
              
          }
          
      }
       
      return(address(0),0);
        
       
    }
    
}
