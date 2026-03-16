import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Account, CallData, RpcProvider, stark } from "starknet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_RPC_URL = "https://starknet-sepolia.drpc.org";
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const TARGET_DIR = path.resolve(__dirname, "..", "target", "dev");
const ENV_PATH = path.join(ROOT_DIR, ".env.local");

// Load .env.local manually (tsx doesn't auto-load it like Next.js does)
if (fs.existsSync(ENV_PATH)) {
  const lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  console.log("Loaded environment from .env.local");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function findArtifactPath(suffix: string): string {
  if (!fs.existsSync(TARGET_DIR)) {
    throw new Error(`Scarb build output not found at ${TARGET_DIR}. Run 'scarb build' first.`);
  }

  const matches = fs
    .readdirSync(TARGET_DIR)
    .filter((entry) => entry.endsWith(suffix))
    .sort();

  if (matches.length === 0) {
    throw new Error(`No artifact ending with '${suffix}' found in ${TARGET_DIR}.`);
  }

  const preferred = matches.find((entry) => entry.startsWith("dare_board_")) ?? matches[0];
  return path.join(TARGET_DIR, preferred);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function upsertEnvVar(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  const trimmed = content.trimEnd();
  return trimmed.length > 0 ? `${trimmed}\n${line}\n` : `${line}\n`;
}

async function deployWithCompatibleApi(
  account: Account,
  classHash: string,
  constructorCalldata: string[],
) {
  const salt = stark.randomAddress();

  try {
    return await (account as any).deployContract({
      classHash,
      constructorCalldata,
      salt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.toLowerCase().includes("salt")) {
      throw error;
    }

    return await (account as any).deployContract({
      classHash,
      constructorCalldata,
      addressSalt: salt,
    });
  }
}

// STRK token address on Sepolia (for balance pre-check)
const STRK_SEPOLIA = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

async function deploy() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? DEFAULT_RPC_URL;
  // IMPORTANT: DEPLOYER_PUBLIC_KEY must be the ACCOUNT CONTRACT ADDRESS
  // (e.g. the ArgentX/Braavos/OZ wallet address visible in the wallet UI),
  // NOT the raw ECDSA public key. In Starknet these differ.
  const deployerAddress = requireEnv("DEPLOYER_PUBLIC_KEY");
  const deployerPrivateKey = requireEnv("DEPLOYER_PRIVATE_KEY");

  const provider = new RpcProvider({ nodeUrl: rpcUrl });

  // starknet.js v9: Account takes AccountOptions object { provider, address, signer, cairoVersion? }
  const account = new Account({ provider, address: deployerAddress, signer: deployerPrivateKey, cairoVersion: "1" });

  // Pre-flight: call balanceOf on STRK token contract to verify the deployer has funds.
  // RpcProvider.callContract is the correct v9 API — there is no getBalance() on the provider.
  console.log(`Deployer address: ${deployerAddress}`);
  try {
    const [low, high] = await provider.callContract({
      contractAddress: STRK_SEPOLIA,
      entrypoint: "balanceOf",
      calldata: [deployerAddress],
    });
    const strkBalance = BigInt(low) + (BigInt(high) << 128n);
    console.log(`STRK balance: ${(Number(strkBalance) / 1e18).toFixed(6)} STRK`);
    if (strkBalance === 0n) {
      throw new Error(
        `Deployer wallet has zero STRK balance at ${deployerAddress}.\n` +
        `Fund it at https://starknet.io/starknet-faucet/ then retry.\n` +
        `Note: DEPLOYER_PUBLIC_KEY must be the wallet CONTRACT ADDRESS shown in your wallet UI,\n` +
        `not the raw ECDSA public key — these are different things in Starknet!`
      );
    }
  } catch (err: any) {
    if (err.message?.includes("zero STRK balance")) throw err;
    // If the balanceOf call itself fails (e.g. RPC issue), warn and continue
    console.warn(`Could not verify balance: ${err.message}. Proceeding anyway...`);
  }

  const sierraPath = findArtifactPath(".contract_class.json");
  const casmPath = findArtifactPath(".compiled_contract_class.json");
  const sierra = readJson<unknown>(sierraPath);
  const casm = readJson<unknown>(casmPath);

  console.log(`Using Sierra artifact: ${path.basename(sierraPath)}`);
  console.log(`Using CASM artifact:   ${path.basename(casmPath)}`);

  let classHash: string;
  try {
    console.log("Declaring contract...");
    const declareResponse = await account.declare({ contract: sierra as any, casm: casm as any });
    await provider.waitForTransaction(declareResponse.transaction_hash);
    classHash = declareResponse.class_hash;
    console.log(`Class hash: ${classHash}`);
  } catch (err: any) {
    // If class was already declared, extract hash from the error data and continue
    const errMsg: string = err?.baseError?.data ?? err?.message ?? "";
    const match = errMsg.match(/0x[0-9a-fA-F]{60,}/);
    if (match) {
      classHash = match[0];
      console.log(`Class already declared. Reusing class hash: ${classHash}`);
    } else {
      throw err;
    }
  }

  console.log("Deploying contract instance...");
  const constructorCalldata = CallData.compile({ owner: deployerAddress });
  const deployResponse = await deployWithCompatibleApi(account, classHash, constructorCalldata);
  await provider.waitForTransaction(deployResponse.transaction_hash);

  const contractAddress = deployResponse.contract_address as string;
  console.log(`Contract deployed at: ${contractAddress}`);

  const existingEnv = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  let nextEnv = upsertEnvVar(existingEnv, "NEXT_PUBLIC_CONTRACT_ADDRESS", contractAddress);
  nextEnv = upsertEnvVar(nextEnv, "CONTRACT_CLASS_HASH", classHash);
  fs.writeFileSync(ENV_PATH, nextEnv, "utf8");

  console.log(`Updated ${ENV_PATH} with NEXT_PUBLIC_CONTRACT_ADDRESS and CONTRACT_CLASS_HASH.`);
}

deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
