const fs = require('fs');
const path = require('path');

function cleanFlatten(source) {
    let foundSPDX = false;
    let foundPragma = false;
    return source.split('\n').filter(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('// Sources flattened with')) return false;
        if (trimmed.startsWith('// File ')) return false;
        if (trimmed.startsWith('// Original license:')) return false;
        if (trimmed.includes('SPDX-License-Identifier')) {
            if (foundSPDX) return false;
            foundSPDX = true;
        }
        if (trimmed.startsWith('pragma solidity')) {
            if (foundPragma) return false;
            foundPragma = true;
        }
        return true;
    }).join('\n');
}

async function flattenContract(hre, contractName, outputDir) {
    let contractPath = `contracts/${contractName}.sol`;
    if (!fs.existsSync(contractPath)) throw new Error(`${contractPath} not found`);

    let source = await hre.run("flatten:get-flattened-sources", { files: [contractPath] });
    let cleaned = cleanFlatten(source);

    fs.mkdirSync(outputDir, { recursive: true });
    let outputPath = path.join(outputDir, `${contractName}.flattened.sol`);
    fs.writeFileSync(outputPath, cleaned);
    console.log(`${contractName} -> ${outputPath} (${(cleaned.length / 1024).toFixed(1)} KB)`);
}

task("flatten:contract", "Flatten a specific contract")
    .addParam("contract", "Contract name")
    .addOptionalParam("output", "Output directory", "flattened")
    .setAction(async (taskArgs, hre) => {
        await flattenContract(hre, taskArgs.contract, taskArgs.output);
    });

task("flatten:all-routers", "Flatten all router contracts")
    .addOptionalParam("output", "Output directory", "flattened")
    .setAction(async (taskArgs, hre) => {
        for (let c of ["ButterRouterV3", "ButterRouterV31", "ButterRouterV4"]) {
            try { await flattenContract(hre, c, taskArgs.output); } catch (e) { console.log(`skip ${c}: ${e.message}`); }
        }
    });

task("flatten:adapters", "Flatten adapter contracts")
    .addOptionalParam("output", "Output directory", "flattened")
    .setAction(async (taskArgs, hre) => {
        for (let c of ["SwapAdapter", "SwapAdapterV3", "OmniAdapter"]) {
            try { await flattenContract(hre, c, taskArgs.output); } catch (e) { console.log(`skip ${c}: ${e.message}`); }
        }
    });

task("flatten:receivers", "Flatten receiver contracts")
    .addOptionalParam("output", "Output directory", "flattened")
    .setAction(async (taskArgs, hre) => {
        for (let c of ["Receiver", "ReceiverV2"]) {
            try { await flattenContract(hre, c, taskArgs.output); } catch (e) { console.log(`skip ${c}: ${e.message}`); }
        }
    });

task("flatten:all", "Flatten all contracts")
    .addOptionalParam("output", "Output directory", "flattened")
    .setAction(async (taskArgs, hre) => {
        await hre.run("flatten:all-routers", { output: taskArgs.output });
        await hre.run("flatten:adapters", { output: taskArgs.output });
        await hre.run("flatten:receivers", { output: taskArgs.output });
    });
