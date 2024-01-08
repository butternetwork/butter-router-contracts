
exports.verify = async function (addr, arg, code,chainId) {
    if(needVerify(chainId)) {
        await run("verify:verify", {
            address: addr,
            constructorArguments: arg,
            contract: code
          });
    }
  }

  function needVerify(chainId){
    let needs = [1,10,56,137,100,199,43114,42161,59144,8453,1101,80001]
    if(needs.includes(chainId)){
        return true;
    } else {
        return false;
    }
}