const fs = require('fs');
const path = require('path');

// Function to remove duplicate headers and clean up flattened contract
function cleanFlattenedContract(source) {
  // Ensure source is a string
  if (typeof source !== 'string') {
    console.log(`Warning: source is not a string, type: ${typeof source}`);
    source = String(source);
  }
  
  console.log(`Input source length: ${source.length} characters, ${source.split('\n').length} lines`);
  
  const lines = source.split('\n');
  const cleanedLines = [];
  let hasSeenLicense = false;  // Changed to boolean flag to only keep first license
  let hasSeenPragma = false;   // Only keep one pragma statement
  let mainPragma = null;       // Store the main pragma version
  
  // First pass: find the most specific pragma version (without ^)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('pragma solidity')) {
      // Prefer specific version over caret versions
      if (!trimmedLine.includes('^') && !trimmedLine.includes('>=')) {
        mainPragma = line;
        break;
      } else if (!mainPragma) {
        mainPragma = line;
      }
    }
  }
  
  // Second pass: clean the file
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines at the beginning only
    if (cleanedLines.length === 0 && trimmedLine === '') {
      continue;
    }
    
    // Handle SPDX license identifiers - only keep the very first one
    if (trimmedLine.startsWith('// SPDX-License-Identifier:')) {
      if (!hasSeenLicense) {
        hasSeenLicense = true;
        cleanedLines.push(line);
      }
      continue;
    }
    
    // Handle pragma statements - only keep the main one
    if (trimmedLine.startsWith('pragma solidity')) {
      if (!hasSeenPragma && line === mainPragma) {
        hasSeenPragma = true;
        cleanedLines.push(line);
      }
      continue;
    }
    
    // Remove file comment headers (only those with @ version markers)
    if (trimmedLine.startsWith('// File ') && trimmedLine.includes('@')) {
      continue;
    }
    
    // Keep ALL other lines including contracts, imports, functions, etc.
    cleanedLines.push(line);
  }
  
  console.log(`After initial cleaning: ${cleanedLines.length} lines`);
  
  // Reorganize to ensure proper order: flatten header, SPDX, pragma, then rest
  const finalLines = [];
  let flattenHeader = null;
  let spdxLine = null;
  let pragmaLine = mainPragma;
  const otherLines = [];
  
  for (const line of cleanedLines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('// Sources flattened')) {
      flattenHeader = line;
    } else if (trimmedLine.startsWith('// SPDX-License-Identifier:')) {
      spdxLine = line;
    } else if (trimmedLine.startsWith('pragma solidity')) {
      // Already have it in mainPragma
    } else {
      otherLines.push(line);
    }
  }
  
  // Build final output in correct order
  if (flattenHeader) {
    finalLines.push(flattenHeader);
    finalLines.push('');
  }
  if (spdxLine) {
    finalLines.push(spdxLine);
  }
  if (pragmaLine) {
    finalLines.push(pragmaLine.trim()); // Ensure proper formatting
    finalLines.push('');
  }
  
  // Add the rest of the content
  let consecutiveEmptyLines = 0;
  for (const line of otherLines) {
    if (line.trim() === '') {
      consecutiveEmptyLines++;
      if (consecutiveEmptyLines <= 2) {  // Allow up to 2 consecutive empty lines
        finalLines.push(line);
      }
    } else {
      consecutiveEmptyLines = 0;
      finalLines.push(line);
    }
  }
  
  console.log(`Final output: ${finalLines.length} lines`);
  return finalLines.join('\n');
}

task("flatten:contract", "Flatten a specific contract")
  .addParam("contract", "Contract name to flatten")
  .addOptionalParam("output", "Output directory", "flattened")
  .setAction(async (taskArgs, hre) => {
    const contractName = taskArgs.contract;
    const outputDir = taskArgs.output;
    
    console.log(`Flattening contract: ${contractName}`);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      // Check if contract file exists
      const contractPath = `contracts/${contractName}.sol`;
      if (!fs.existsSync(contractPath)) {
        throw new Error(`Contract file ${contractPath} not found`);
      }
      
      // Use exec to write directly to a temp file to avoid buffer truncation
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const tempFile = path.join(outputDir, `${contractName}.raw.sol`);
      
      console.log(`Running: npx hardhat flatten ${contractPath} > ${tempFile}`);
      
      // Write directly to file to avoid buffer truncation issues
      await execAsync(
        `npx hardhat flatten ${contractPath} > ${tempFile} 2>&1`,
        { cwd: process.cwd() }
      );
      
      // Read the flattened content from the temp file
      let flattenedOutput = fs.readFileSync(tempFile, 'utf8');
      
      // Remove Node.js warning if present
      if (flattenedOutput.includes('WARNING: You are using a version of Node.js')) {
        const lines = flattenedOutput.split('\n');
        const warningIndex = lines.findIndex(line => line.includes('WARNING: You are using a version of Node.js'));
        if (warningIndex !== -1) {
          lines.splice(warningIndex, 1);
          flattenedOutput = lines.join('\n');
        }
      }
      
      console.log(`Raw flatten output from file: ${flattenedOutput.length} characters, ${flattenedOutput.split('\n').length} lines`);
      
      // Clean the flattened content
      const cleaned = cleanFlattenedContract(flattenedOutput);
      
      // Write to output file
      const outputPath = path.join(outputDir, `${contractName}.flattened.sol`);
      fs.writeFileSync(outputPath, cleaned);
      
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
      console.log(`✅ Flattened contract saved to: ${outputPath}`);
      console.log(`📊 File size: ${(cleaned.length / 1024).toFixed(2)} KB`);
      
      // Count lines
      const lineCount = cleaned.split('\n').length;
      console.log(`📝 Total lines: ${lineCount}`);
      
    } catch (error) {
      console.error(`❌ Error flattening ${contractName}:`, error.message);
    }
  });

task("flatten:all-routers", "Flatten all router contracts")
  .addOptionalParam("output", "Output directory", "flattened")
  .setAction(async (taskArgs, hre) => {
    const contracts = [
      "ButterRouterV3", 
      "ButterRouterV31"
    ];
    
    console.log("🚀 Starting to flatten all router contracts...");
    
    for (const contract of contracts) {
      try {
        await hre.run("flatten:contract", {
          contract: contract,
          output: taskArgs.output
        });
      } catch (error) {
        console.log(`⚠️  Skipping ${contract}: ${error.message}`);
      }
    }
    
    console.log("✅ All router contracts flattened successfully!");
  });

task("flatten:adapters", "Flatten adapter contracts")
  .addOptionalParam("output", "Output directory", "flattened")
  .setAction(async (taskArgs, hre) => {
    const contracts = [
      "SwapAdapter",
      "SwapAdapterV2", 
      "SwapAdapterV3",
      "OmniAdapter"
    ];
    
    console.log("🚀 Starting to flatten adapter contracts...");
    
    for (const contract of contracts) {
      try {
        await hre.run("flatten:contract", {
          contract: contract,
          output: taskArgs.output
        });
      } catch (error) {
        console.log(`⚠️  Skipping ${contract}: ${error.message}`);
      }
    }
    
    console.log("✅ All adapter contracts flattened successfully!");
  });

task("flatten:receivers", "Flatten receiver contracts")
  .addOptionalParam("output", "Output directory", "flattened")
  .setAction(async (taskArgs, hre) => {
    const contracts = [
      "Receiver",
      "ReceiverV2",
      "ReceiverV3"
    ];
    
    console.log("🚀 Starting to flatten receiver contracts...");
    
    for (const contract of contracts) {
      try {
        await hre.run("flatten:contract", {
          contract: contract,
          output: taskArgs.output
        });
      } catch (error) {
        console.log(`⚠️  Skipping ${contract}: ${error.message}`);
      }
    }
    
    console.log("✅ All receiver contracts flattened successfully!");
  });

task("flatten:all", "Flatten all contracts")
  .addOptionalParam("output", "Output directory", "flattened")
  .setAction(async (taskArgs, hre) => {
    console.log("🌟 Starting to flatten ALL contracts...");
    
    // Flatten all categories
    await hre.run("flatten:all-routers", { output: taskArgs.output });
    await hre.run("flatten:adapters", { output: taskArgs.output });
    await hre.run("flatten:receivers", { output: taskArgs.output });
    
    console.log("🎉 All contracts have been flattened successfully!");
    console.log(`📁 Check the '${taskArgs.output}' directory for flattened files.`);
  });

module.exports = {};