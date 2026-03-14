/**
 * DareBoard Contract Deployment Script
 *
 * Auto-deploys an OZ account (if needed) then declares + deploys DareBoard.
 *
 * Prerequisites:
 *   1. scarb build  (in /app/contracts)
 *   2. Send STRK to the deployer address printed below
 *   3. Run: npx ts-node --project tsconfig.json deploy.ts
 */

import { RpcProvider, Account, CallData, stark, json, hash, ec } from "starknet";
import * as fs from "fs";
import * as path from "path";

const RPC_URL = "https://starknet-sepolia-rpc.publicnode.com";

// Updated deployer credentials (matched pair)
const PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ||
  "0x00e6d4c153062a9191cedcb0521ecc7772481a95b99c21da5fe1c1133f825ff2";

// OpenZeppelin SimpleAccount v0.6.1 class hash (already declared on Sepolia)
const OZ_CLASS_HASH =
  "0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f";

function getDeployerAddress(pubKey: string): string {
  const calldata = CallData.compile({ public_key: pubKey });
  return hash.calculateContractAddressFromHash(
    pubKey,
    OZ_CLASS_HASH,
    calldata,
    "0x0"
  );
}

async function waitForFunds(
  provider: RpcProvider,
  address: string,
  minStrk = BigInt("10000000000000000") // 0.01 STRK
): Promise<void> {
  const STRK_TOKEN =
    "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
  const SEL_BALANCE =
    "0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e";

  console.log("Waiting for STRK funds at", address, "...");
  for (let i = 0; i < 360; i++) {  // 30 min at 5s intervals
    try {
      const res = await provider.callContract({
        contractAddress: STRK_TOKEN,
        entrypoint: SEL_BALANCE,
        calldata: [address],
      });
      const balance = BigInt(res[0]);
      if (balance >= minStrk) {
        console.log(
          `  Balance: ${(Number(balance) / 1e18).toFixed(4)} STRK ✅`
        );
        return;
      }
      process.stdout.write(
        `  ${(Number(balance) / 1e18).toFixed(6)} STRK — waiting...\r`
      );
    } catch {}
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Timed out waiting for funds. Please fund the address and retry.");
}

async function ensureAccountDeployed(
  provider: RpcProvider,
  address: string,
  pubKey: string,
  privateKey: string
): Promise<Account> {
  // Check if already deployed
  try {
    await provider.getClassHashAt(address);
    console.log("Account already deployed at", address);
    return new Account(provider, address, privateKey);
  } catch {
    // Not deployed — deploy it
  }

  console.log("Deploying OZ account at", address, "...");
  const account = new Account(provider, address, privateKey);
  const calldata = CallData.compile({ public_key: pubKey });

  const { transaction_hash, contract_address } = await account.deployAccount({
    classHash: OZ_CLASS_HASH,
    constructorCalldata: calldata,
    addressSalt: pubKey,
    contractAddress: address,
  });

  console.log("  Deploy tx:", transaction_hash);
  await provider.waitForTransaction(transaction_hash);
  console.log("  Account deployed ✅");
  return new Account(provider, contract_address, privateKey);
}

async function deploy() {
  console.log("\n==============================");
  console.log("  DareBoard Deployment Script  ");
  console.log("==============================\n");

  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  // Derive public key + address
  const pubKey = ec.starkCurve.getStarkKey(PRIVATE_KEY);
  const deployerAddress = getDeployerAddress(pubKey);

  console.log("Deployer address :", deployerAddress);
  console.log("Public key       :", pubKey);
  console.log(
    "Fund this address with STRK on Starknet Sepolia if not already funded.\n"
  );

  // ── Wait for funds ─────────────────────────────────────────────────────────
  await waitForFunds(provider, deployerAddress);

  // ── Ensure account is deployed ────────────────────────────────────────────
  const account = await ensureAccountDeployed(
    provider,
    deployerAddress,
    pubKey,
    PRIVATE_KEY
  );

  // ── Read compiled artifacts ───────────────────────────────────────────────
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
  console.log("\nDeclaring contract class...");
  let classHash: string;
  try {
    const declareResponse = await account.declare({ contract: sierra, casm });
    await provider.waitForTransaction(declareResponse.transaction_hash);
    classHash = declareResponse.class_hash;
    console.log("Class hash:", classHash, "✅");
  } catch (e: any) {
    const msg = e.message || JSON.stringify(e);
    if (
      msg.includes("already declared") ||
      msg.includes("ClassAlreadyDeclared") ||
      msg.includes("DuplicateTx") ||
      msg.includes("StarknetErrorCode.CLASS_ALREADY_DECLARED")
    ) {
      classHash = hash.computeSierraContractClassHash(sierra);
      console.log("Already declared. Class hash:", classHash, "✅");
    } else {
      throw e;
    }
  }

  // ── Deploy DareBoard ───────────────────────────────────────────────────────
  console.log("\nDeploying DareBoard contract...");
  const constructorCalldata = CallData.compile({ owner: deployerAddress });
  const deployResponse = await account.deployContract({
    classHash,
    constructorCalldata,
    salt: stark.randomAddress(),
  });
  await provider.waitForTransaction(deployResponse.transaction_hash);
  const contractAddress = deployResponse.contract_address;

  console.log("\n✅ Contract deployed at :", contractAddress);
  console.log("   Tx hash             :", deployResponse.transaction_hash);
  console.log(
    "   Starkscan           :",
    `https://sepolia.starkscan.co/contract/${contractAddress}`
  );

  // ── Write ABI to frontend ─────────────────────────────────────────────────
  const abiDest = path.join(__dirname, "../../frontend/src/lib/abi.json");
  fs.writeFileSync(abiDest, JSON.stringify(sierra.abi, null, 2));
  console.log("\n✅ ABI written to", abiDest);

  // ── Update frontend .env ───────────────────────────────────────────────────
  const envPath = path.join(__dirname, "../../frontend/.env");
  let envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";

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

  console.log("\n🚀 Next steps:");
  console.log("   sudo supervisorctl restart frontend");
  console.log("   Then open the app — demo mode OFF, live contract active!\n");
}

deploy().catch((err) => {
  console.error("\nDeployment failed:", err.message || err);
  process.exit(1);
});
