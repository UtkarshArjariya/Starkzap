/**
 * DareBoard Contract Deployment Script
 *
 * Declares (if needed) + deploys DareBoard via sncast, then updates frontend env.
 *
 * Prerequisites:
 *   1. scarb build  (in /contracts)
 *   2. sncast configured with oz_deployer account
 *   3. Fund the deployer with STRK
 *   4. Run: npx ts-node --project tsconfig.json deploy.ts
 */

import { json, hash } from "starknet";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ── Load .env.local ───────────────────────────────────────────────────────────
const envFilePath = path.join(__dirname, "../../.env.local");

if (fs.existsSync(envFilePath)) {
  const envLines = fs.readFileSync(envFilePath, "utf8").split(/\r?\n/);
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// sncast reads account + RPC URL from contracts/snfoundry.toml
const CONTRACTS_DIR = path.join(__dirname, "..");

function runSncast(args: string): string {
  const cmd = `sncast ${args}`;
  console.log(`  $ ${cmd}\n`);
  return execSync(cmd, { encoding: "utf-8", timeout: 300_000, cwd: CONTRACTS_DIR });
}

async function deploy() {
  console.log("\n==============================");
  console.log("  DareBoard Deployment Script  ");
  console.log("==============================\n");

  console.log("Config  : contracts/snfoundry.toml");
  // ── Read compiled artifacts ────────────────────────────────────────────────
  const sierraPath = path.join(
    CONTRACTS_DIR,
    "target/dev/dare_board_DareBoard.contract_class.json",
  );
  const compiledPath = path.join(
    CONTRACTS_DIR,
    "target/dev/dare_board_DareBoard.compiled_contract_class.json",
  );

  if (!fs.existsSync(sierraPath) || !fs.existsSync(compiledPath)) {
    console.error("Compiled artifacts not found. Run: scarb build");
    process.exit(1);
  }

  const sierra = json.parse(fs.readFileSync(sierraPath).toString());
  if (typeof sierra.abi === "string") sierra.abi = JSON.parse(sierra.abi);

  // ── Declare ────────────────────────────────────────────────────────────────
  let classHash: string;
  const predeclaredClassHash = process.env.CONTRACT_CLASS_HASH;

  if (predeclaredClassHash) {
    classHash = predeclaredClassHash;
    console.log("Using existing class hash:", classHash, "\n");
  } else {
    console.log("Declaring contract class...");
    try {
      const declareOutput = runSncast(
        `-w --wait-timeout 300 declare --contract-name DareBoard`,
      );
      // Parse class_hash from sncast output
      const classHashMatch = declareOutput.match(
        /[Cc]lass[_ ][Hh]ash:\s*(0x[0-9a-fA-F]+)/,
      );
      if (!classHashMatch) {
        // Compute it from sierra
        classHash = hash.computeSierraContractClassHash(sierra);
        console.log("  Computed class hash:", classHash);
      } else {
        classHash = classHashMatch[1];
        console.log("  Declared class hash:", classHash);
      }
    } catch (e: any) {
      const msg = e?.stderr || e?.stdout || e?.message || String(e);
      if (
        msg.includes("already declared") ||
        msg.includes("ClassAlreadyDeclared") ||
        msg.includes("StarkClassAlreadyDeclared")
      ) {
        classHash = hash.computeSierraContractClassHash(sierra);
        console.log("  Already declared. Class hash:", classHash);
      } else {
        throw new Error(`Declare failed: ${msg}`);
      }
    }
  }

  // ── Get deployer address from sncast account ──────────────────────────────
  let deployerAddress: string;
  try {
    const accountsOutput = execSync("sncast account list", {
      encoding: "utf-8",
    });
    const addrMatch = accountsOutput.match(
      /address:\s*(0x[0-9a-fA-F]+)/,
    );
    deployerAddress = addrMatch
      ? addrMatch[1]
      : "0x1a0d24240a41d0cbee5489d0d0503746282276f814da7cc611588d262789f8";
  } catch {
    deployerAddress =
      "0x1a0d24240a41d0cbee5489d0d0503746282276f814da7cc611588d262789f8";
  }
  console.log("Deployer address:", deployerAddress, "\n");

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("Deploying DareBoard contract...");
  const deployOutput = runSncast(
    `-w --wait-timeout 300 deploy --class-hash ${classHash} --constructor-calldata ${deployerAddress} --unique`,
  );

  // Parse contract address and transaction hash from sncast output
  // sncast outputs "Contract Address: 0x..." or "contract_address: 0x..."
  const addrMatch = deployOutput.match(
    /[Cc]ontract[_ ][Aa]ddress:\s*(0x[0-9a-fA-F]+)/,
  );
  const txMatch = deployOutput.match(
    /[Tt]ransaction[_ ][Hh]ash:\s*(0x[0-9a-fA-F]+)/,
  );

  if (!addrMatch) {
    console.log("sncast output:\n", deployOutput);
    throw new Error("Could not parse contract address from sncast output");
  }

  const contractAddress = addrMatch[1];
  const txHash = txMatch ? txMatch[1] : "unknown";

  console.log("\n  Contract deployed at :", contractAddress);
  console.log("  Tx hash             :", txHash);
  console.log(
    "  Voyager             :",
    `https://sepolia.voyager.online/contract/${contractAddress}`,
  );

  // ── Write ABI to frontend ─────────────────────────────────────────────────
  const abiDest = path.join(__dirname, "../../src/lib/abi.json");
  fs.writeFileSync(abiDest, JSON.stringify(sierra.abi, null, 2));
  console.log("\n  ABI written to", abiDest);

  // ── Update .env.local ─────────────────────────────────────────────────────
  let envContent = fs.existsSync(envFilePath)
    ? fs.readFileSync(envFilePath, "utf8")
    : "";

  // Update or add NEXT_PUBLIC_CONTRACT_ADDRESS
  if (envContent.includes("NEXT_PUBLIC_CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`,
    );
  } else {
    envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`;
  }

  // Update or add CONTRACT_CLASS_HASH
  if (envContent.match(/^CONTRACT_CLASS_HASH=/m)) {
    envContent = envContent.replace(
      /^CONTRACT_CLASS_HASH=.*/m,
      `CONTRACT_CLASS_HASH=${classHash}`,
    );
  } else if (envContent.includes("# CONTRACT_CLASS_HASH")) {
    envContent = envContent.replace(
      /# CONTRACT_CLASS_HASH.*/,
      `CONTRACT_CLASS_HASH=${classHash}`,
    );
  } else {
    envContent += `CONTRACT_CLASS_HASH=${classHash}\n`;
  }

  // Update or add DEPLOYER_ACCOUNT_ADDRESS
  if (envContent.includes("DEPLOYER_ACCOUNT_ADDRESS=")) {
    envContent = envContent.replace(
      /DEPLOYER_ACCOUNT_ADDRESS=.*/,
      `DEPLOYER_ACCOUNT_ADDRESS=${deployerAddress}`,
    );
  } else {
    envContent += `DEPLOYER_ACCOUNT_ADDRESS=${deployerAddress}\n`;
  }

  fs.writeFileSync(envFilePath, envContent);
  console.log("  .env.local updated\n");

  console.log("Done! Restart the frontend to use the new contract.\n");
}

deploy().catch((err) => {
  console.error("\nDeployment failed:", err.message || err);
  process.exit(1);
});
