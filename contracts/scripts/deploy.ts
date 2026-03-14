/**
 * DareBoard Contract Deployment Script
 *
 * Prerequisites:
 *   1. Build the contract:   cd /app/contracts && scarb build
 *   2. Install deps:         cd /app/contracts/scripts && npm init -y && npm install starknet ts-node typescript
 *   3. Run:                  cd /app/contracts/scripts && npx ts-node --project tsconfig.json deploy.ts
 *
 * After deploying, update REACT_APP_CONTRACT_ADDRESS in /app/frontend/.env
 */

import { RpcProvider, Account, CallData, stark, json } from "starknet";
import * as fs from "fs";
import * as path from "path";

const RPC_URL = "https://starknet-sepolia.public.blastapi.io";
const DEPLOYER_PUBLIC_KEY =
  process.env.DEPLOYER_PUBLIC_KEY ||
  "0x05621F5e671ccb298FD6B226A8e0Bfba97DAF4BAa6196C2F12cEEe03A15765a9";
const DEPLOYER_PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ||
  "0x00dcd338a391374e143d3da83397431ae5ab6949fb055ca98735debde67fe742";

async function deploy() {
  console.log("Connecting to Starknet Sepolia...");
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, DEPLOYER_PUBLIC_KEY, DEPLOYER_PRIVATE_KEY);

  console.log("Deployer address:", DEPLOYER_PUBLIC_KEY);

  // ── Read compiled artifacts ──────────────────────────────────────────────
  const contractsDir = path.join(__dirname, "..");
  const sierraPath = path.join(
    contractsDir,
    "target/dev/dare_board_DareBoard.contract_class.json"
  );
  const casmPath = path.join(
    contractsDir,
    "target/dev/dare_board_DareBoard.compiled_contract_class.json"
  );

  if (!fs.existsSync(sierraPath)) {
    console.error("Sierra artifact not found. Run: scarb build");
    process.exit(1);
  }

  const sierra = json.parse(fs.readFileSync(sierraPath).toString());
  const casm = json.parse(fs.readFileSync(casmPath).toString());

  // ── Declare ───────────────────────────────────────────────────────────────
  console.log("Declaring contract class...");
  let classHash: string;
  try {
    const declareResponse = await account.declare({ contract: sierra, casm });
    await provider.waitForTransaction(declareResponse.transaction_hash);
    classHash = declareResponse.class_hash;
    console.log("Class hash:", classHash);
  } catch (e: any) {
    if (e.message && e.message.includes("already declared")) {
      // Extract class hash from error or sierra file
      const { hash } = await provider.getClassHashAt("0x0"); // won't work; use manual
      throw new Error(
        "Contract already declared. Extract classHash from the Scarb artifacts or Starkscan."
      );
    }
    throw e;
  }

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("Deploying contract...");
  const constructorCalldata = CallData.compile({ owner: DEPLOYER_PUBLIC_KEY });
  const deployResponse = await account.deployContract({
    classHash,
    constructorCalldata,
    salt: stark.randomAddress(),
  });
  await provider.waitForTransaction(deployResponse.transaction_hash);
  const contractAddress = deployResponse.contract_address;
  console.log("\n✅ Contract deployed at:", contractAddress);
  console.log("   Tx hash:", deployResponse.transaction_hash);
  console.log(
    "   Starkscan:",
    `https://sepolia.starkscan.co/contract/${contractAddress}`
  );

  // ── Copy ABI to frontend ──────────────────────────────────────────────────
  const abiDest = path.join(__dirname, "../../frontend/src/lib/abi.json");
  fs.writeFileSync(abiDest, JSON.stringify(sierra.abi, null, 2));
  console.log("\n✅ ABI written to", abiDest);

  // ── Update .env ───────────────────────────────────────────────────────────
  const envPath = path.join(__dirname, "../../frontend/.env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  if (envContent.includes("REACT_APP_CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /REACT_APP_CONTRACT_ADDRESS=.*/,
      `REACT_APP_CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nREACT_APP_CONTRACT_ADDRESS=${contractAddress}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log("✅ REACT_APP_CONTRACT_ADDRESS updated in frontend/.env");

  console.log("\n🚀 Done! Next steps:");
  console.log("   1. Restart the frontend: sudo supervisorctl restart frontend");
  console.log("   2. Open the app and test contract interactions.");
}

deploy().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
