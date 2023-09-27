// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./interface/IFeeManager.sol";
import "./lib/ErrorMessage.sol";
import "./lib/Helper.sol";




contract FeeManager is Ownable2Step,IFeeManager{
   
   uint256 constant FEE_DENOMINATOR = 1000;

   struct FeeStruct{
       uint256 totalShare;
       uint256 integratorShare;
       address integrator;
   }

   mapping (address => FeeStruct) public integratorFees;

    // Integrator -> TokenAddress -> Balance
    mapping(address => mapping(address => uint256)) private _balances;
    // TokenAddress -> Balance
    mapping(address => uint256) private _butterBalances;

    event FeesCollected(
        address indexed _token,
        address indexed _integrator,
        uint256 _integratorFee,
        uint256 _butterFee
    );
    event FeesWithdrawn(
        address indexed _token,
        address indexed _to,
        uint256 _amount
    );
    event ButterFeesWithdrawn(
        address indexed _token,
        address indexed _to,
        uint256 _amount
    );

    event SetIntegratorFees(FeeStruct fee);

    constructor(address _owner) payable {
        require(_owner != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);
        _transferOwnership(_owner);
    }
    

    function setIntegratorFees(FeeStruct calldata _fees) external onlyOwner {
       require(_fees.integrator != Helper.ZERO_ADDRESS, ErrorMessage.ZERO_ADDR);
       FeeStruct storage f =  integratorFees[_fees.integrator];

       if(_fees.totalShare > 0 && _fees.totalShare < FEE_DENOMINATOR) {
         f.totalShare = _fees.totalShare;
       }

       if(_fees.integratorShare < FEE_DENOMINATOR) {
          f.integratorShare = _fees.integratorShare;
       }
       require(f.integratorShare <= f.totalShare);

       emit SetIntegratorFees(_fees);
    }

    function getFee(address integrator, address inpputToken,uint256 inputAmount) external view override returns(address feeToken,uint256 amount){
          FeeStruct storage f =  integratorFees[integrator];
          feeToken = inpputToken;
          amount = inputAmount * f.totalShare / FEE_DENOMINATOR;
    }

    function getAmountBeforeFee(address integrator, address inpputToken,uint256 inputAmount)external view override returns(address feeToken,uint256 beforeAmount){
        FeeStruct storage f =  integratorFees[integrator];
        feeToken = inpputToken;
        if(f.totalShare == 0){
           beforeAmount = inputAmount;
        } else {
            beforeAmount = inputAmount * FEE_DENOMINATOR / (FEE_DENOMINATOR - f.totalShare) + 1;
        }
        
    }

    function payFeeWithIntegrator(address integrator, address feeToken,uint256 inputAmount) external payable override {
        FeeStruct storage f =  integratorFees[integrator];
        if(f.totalShare == 0){
            return;
        }
       uint256 amount = inputAmount * f.totalShare / FEE_DENOMINATOR;
       if(Helper._isNative(feeToken)){
         require(msg.value == amount,ErrorMessage.FEE_MISMATCH);
       } else {
          SafeERC20.safeTransferFrom(IERC20(feeToken),msg.sender,address(this),amount);
       }
       uint256 integratorAmount = inputAmount * f.integratorShare;
       _balances[integrator][feeToken] += integratorAmount;
       uint256 butterAmount = amount - integratorAmount;
       _butterBalances[feeToken] += butterAmount;

       emit FeesCollected(feeToken,integrator,integratorAmount,butterAmount);
    } 


    function withdrawIntegratorFees(address[] calldata tokenAddresses)external {
        uint256 length = tokenAddresses.length;
        uint256 balance;
        for (uint256 i = 0; i < length; ) {
            balance = _balances[msg.sender][tokenAddresses[i]];
            if (balance != 0) {
                _balances[msg.sender][tokenAddresses[i]] = 0;
                 Helper._transfer(tokenAddresses[i],payable(msg.sender),balance);
                emit FeesWithdrawn(tokenAddresses[i], msg.sender, balance);
            }
            unchecked {
                ++i;
            }
        }
    }



    function withdrawButterFees(address[] memory tokenAddresses)external onlyOwner
    {
        uint256 length = tokenAddresses.length;
        uint256 balance;
        for (uint256 i = 0; i < length; ) {
            balance = _butterBalances[tokenAddresses[i]];
            _butterBalances[tokenAddresses[i]] = 0;
            Helper._transfer(tokenAddresses[i],msg.sender,balance);
            emit ButterFeesWithdrawn(tokenAddresses[i], msg.sender, balance);
            unchecked {
                ++i;
            }
        }
    }


    function getTokenBalance(address integrator, address token)
        external
        view
        returns (uint256)
    {
        return _balances[integrator][token];
    }


    function getButterBalance(address token)
        external
        view
        returns (uint256)
    {
        return _butterBalances[token];
    }

    
}