let {create,createZk,readFromFile,writeToFile} = require("../../utils/create.js")
let {updateSelectorInfo,setRouters,setStargatePoolId,setLayerZeroChainId} = require("../../utils/helper")

module.exports = async (taskArgs,hre) => {
    const { deployments, getNamedAccounts, ethers,network} = hre;
    const { deployer } = await getNamedAccounts();
    console.log("deployer :", deployer);
    let chainId = await hre.network.config.chainId;
    let AggregationAdaptor = await ethers.getContractFactory("AggregationAdaptor");
    let v2;
    if(chainId === 324 || chainId === 280){
        v2 = await createZk("AggregationAdaptor",[deployer],hre);
        let adapter = AggregationAdaptor.attach(v2);
        await updateSelectorInfo(adapter.address,network.name);
        await setRouters(adapter.address,network.name);
        await setStargatePoolId(adapter.address,network.name);
        await setLayerZeroChainId(adapter.address,network.name);
    } else {
        let salt = process.env.ROUTER_DEPLOY_SALT;
        let param = ethers.utils.defaultAbiCoder.encode(['address'], [deployer])
        let result = await create(salt,AggregationAdaptor.bytecode, param)
        v2 = result[0];
        if(result[1]){
            let adapter = AggregationAdaptor.attach(v2);
            await updateSelectorInfo(adapter.address,network.name);
            await setRouters(adapter.address,network.name);
            await setStargatePoolId(adapter.address,network.name);
            await setLayerZeroChainId(adapter.address,network.name);
        }
    }

    console.log("AggregationAdaptor address :",v2);

    let deploy = await readFromFile(network.name);

    deploy[network.name]["AggregationAdaptor"] = v2;

    await writeToFile(deploy);
}