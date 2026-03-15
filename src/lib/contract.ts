import {
  Account,
  byteArray,
  CallData,
  Contract,
  json,
  RpcProvider,
  shortString,
  uint256
} from "starknet";

import DARE_BOARD_ABI from "@/lib/abi.json";
import type { AppWallet } from "@/lib/starkzap";
import type { CreateDareParams, Dare, DareStatus } from "@/lib/types";
import { addressesEqual } from "@/lib/utils";

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://starknet-sepolia.drpc.org";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

// ── Token constants (Sepolia) ────────────────────────────────────────

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export const TOKENS: Record<string, TokenInfo> = {
  STRK: {
    symbol: "STRK",
    name: "Starknet Token",
    address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    decimals: 18,
  },
  ETH: {
    symbol: "ETH",
    name: "Ether",
    address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    decimals: 18,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

type RawUint256 = {
  low: string | number | bigint;
  high: string | number | bigint;
};

type RawByteArray =
  | string
  | {
    data?: string[];
    pending_word?: string;
    pending_word_len?: number | string;
  };

type RawDare = Record<string, unknown>;

function getProvider() {
  return new RpcProvider({ nodeUrl: RPC_URL });
}

function getContractAddress() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not configured.");
  }
  return CONTRACT_ADDRESS;
}

function getReadContract() {
  return new Contract({
    abi: DARE_BOARD_ABI,
    address: getContractAddress(),
    providerOrAccount: getProvider(),
  });
}

function getWriteContract(account: Account) {
  return new Contract({
    abi: DARE_BOARD_ABI,
    address: getContractAddress(),
    providerOrAccount: account,
  });
}

function isRawUint256(value: unknown): value is RawUint256 {
  return !!value && typeof value === "object" && "low" in value && "high" in value;
}

function normalizeByteArray(value: RawByteArray | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return byteArray.stringFromByteArray({
    data: Array.isArray(value.data) ? value.data : [],
    pending_word: value.pending_word ?? "0x0",
    pending_word_len: Number(value.pending_word_len ?? 0),
  });
}

function normalizeTitle(value: unknown): string {
  // starknet.js v9 may return felt252 as bigint
  let str: string;
  if (typeof value === "bigint") {
    str = "0x" + value.toString(16);
  } else if (typeof value !== "string") {
    return "";
  } else {
    str = value;
  }
  if (str.startsWith("0x")) {
    try {
      return shortString.decodeShortString(str);
    } catch {
      return str;
    }
  }
  return str;
}

function normalizeStatus(value: unknown): DareStatus {
  const valueMap: Record<string, DareStatus> = {
    Open: "Open",
    Claimed: "Claimed",
    Voting: "Voting",
    Approved: "Approved",
    Rejected: "Rejected",
    Expired: "Expired",
    "0": "Open",
    "1": "Claimed",
    "2": "Voting",
    "3": "Approved",
    "4": "Rejected",
    "5": "Expired",
  };

  // starknet.js v9 returns CairoCustomEnum with activeVariant() method
  if (typeof value === "object" && value !== null) {
    if (typeof (value as Record<string, unknown>).activeVariant === "function") {
      const name = String((value as { activeVariant: () => string }).activeVariant());
      return valueMap[name] ?? "Open";
    }
    // Older versions may use activeVariant as a string property
    if ("activeVariant" in value && typeof (value as Record<string, unknown>).activeVariant === "string") {
      return valueMap[String((value as { activeVariant: string }).activeVariant)] ?? "Open";
    }
    // Fallback: check variant keys (CairoCustomEnum.variant)
    if ("variant" in value) {
      const variant = (value as { variant: Record<string, unknown> }).variant;
      for (const key of Object.keys(variant)) {
        if (variant[key] !== undefined && valueMap[key]) {
          return valueMap[key];
        }
      }
    }
  }

  return valueMap[String(value ?? "0")] ?? "Open";
}

function normalizeAddress(value: unknown): string {
  if (typeof value === "bigint") {
    return "0x" + value.toString(16);
  }
  if (typeof value === "number") {
    return "0x" + value.toString(16);
  }
  if (typeof value === "string") {
    return value;
  }
  return "0x0";
}

function normalizeAmount(value: unknown): bigint {
  if (isRawUint256(value)) {
    return uint256.uint256ToBN(value);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return BigInt(value);
  }
  return 0n;
}

function mapToken(address: string): TokenInfo {
  if (addressesEqual(address, TOKENS.ETH.address)) return TOKENS.ETH;
  return TOKENS.STRK;
}

function formatAmount(rawAmount: bigint, token: TokenInfo): string {
  const divisor = 10 ** token.decimals;
  return `${(Number(rawAmount) / divisor).toFixed(4)} ${token.symbol}`;
}

function toDare(raw: RawDare, userHasVoted = false): Dare {
  const rewardToken = normalizeAddress(raw.reward_token);
  const token = mapToken(rewardToken);
  const rawAmount = normalizeAmount(raw.reward_amount);

  return {
    id: BigInt(String(raw.id ?? 0)),
    poster: normalizeAddress(raw.poster),
    title: normalizeTitle(raw.title),
    description: normalizeByteArray(raw.description as RawByteArray),
    rewardToken,
    rewardAmount: (Number(rawAmount) / 10 ** token.decimals).toFixed(4),
    rewardAmountFormatted: formatAmount(rawAmount, token),
    rewardSymbol: token.symbol,
    deadline: Number(raw.deadline ?? 0),
    claimer: normalizeAddress(raw.claimer),
    proofUrl: normalizeByteArray(raw.proof_url as RawByteArray),
    proofDescription: normalizeByteArray(raw.proof_description as RawByteArray),
    proofSubmittedAt: Number(raw.proof_submitted_at ?? 0),
    votingEnd: Number(raw.voting_end ?? 0),
    approveVotes: Number(raw.approve_votes ?? 0),
    rejectVotes: Number(raw.reject_votes ?? 0),
    status: normalizeStatus(raw.status),
    userHasVoted,
  };
}

// ── Read functions ───────────────────────────────────────────────────

export async function getDareCount(): Promise<bigint> {
  if (!CONTRACT_ADDRESS) return 0n;
  const contract = getReadContract();
  const result = await contract.call("get_dare_count", []);
  return BigInt(Array.isArray(result) ? String(result[0]) : String(result));
}

export async function getDare(dareId: bigint, voterAddress?: string): Promise<Dare> {
  const contract = getReadContract();
  const raw = (await contract.call("get_dare", [dareId])) as RawDare;

  let userHasVoted = false;
  if (voterAddress && voterAddress !== "0x0") {
    try {
      const voteResult = await contract.call("has_voter_voted", [dareId, voterAddress]);
      userHasVoted = Array.isArray(voteResult)
        ? voteResult[0] === true || String(voteResult[0]) === "1"
        : voteResult === true || String(voteResult) === "1";
    } catch {
      userHasVoted = false;
    }
  }

  return toDare(raw, userHasVoted);
}

export async function getAllDares(voterAddress?: string): Promise<Dare[]> {
  const count = await getDareCount();
  if (count === 0n) return [];

  const ids = Array.from({ length: Number(count) }, (_, index) => BigInt(index + 1));
  const dares = await Promise.all(ids.map((id) => getDare(id, voterAddress)));
  return dares.sort((left, right) => Number(right.id - left.id));
}

// ── Write functions ──────────────────────────────────────────────────

export async function createDare(wallet: AppWallet, params: CreateDareParams) {
  const contractAddress = getContractAddress();
  const token = mapToken(params.rewardToken);
  const amountWei = BigInt(Math.floor(parseFloat(params.rewardAmount) * 10 ** token.decimals));
  const amountU256 = uint256.bnToUint256(amountWei);
  const deadlineTs = Math.floor(params.deadline.getTime() / 1000);

  // ── Pre-flight validations (match Cairo contract assertions) ──────
  const nowTs = Math.floor(Date.now() / 1000);
  const MINIMUM_LEAD_TIME = 3600; // contract requires 1 hour

  if (deadlineTs <= nowTs + MINIMUM_LEAD_TIME) {
    throw new Error(
      `Deadline must be at least 1 hour from now. ` +
      `Please pick a later time.`
    );
  }

  if (amountWei <= 0n) {
    throw new Error("Reward amount must be greater than 0.");
  }

  // ── Multicall: approve + create_dare ──────────────────────────────
  const approveCall = {
    contractAddress: params.rewardToken,
    entrypoint: "approve",
    calldata: CallData.compile({ spender: contractAddress, amount: amountU256 }),
  };

  const contract = getWriteContract(wallet.account);
  const createCall = contract.populate("create_dare", {
    title: shortString.encodeShortString(params.title.slice(0, 31)),
    description: params.description,
    reward_token: params.rewardToken,
    reward_amount: amountU256,
    deadline: deadlineTs,
  });

  const response = await wallet.account.execute([approveCall, createCall]);
  const provider = getProvider();
  await provider.waitForTransaction(response.transaction_hash);
  return response;
}

export async function claimDare(wallet: AppWallet, dareId: bigint) {
  // ── Pre-flight validations (match Cairo contract assertions) ──────
  const dare = await getDare(dareId, wallet.account.address);
  const nowTs = Math.floor(Date.now() / 1000);

  if (dare.status !== "Open") {
    throw new Error(`This dare is no longer open (status: ${dare.status}).`);
  }

  if (addressesEqual(wallet.account.address, dare.poster)) {
    throw new Error("You cannot claim your own dare.");
  }

  if (nowTs >= dare.deadline) {
    throw new Error("This dare's deadline has already passed and cannot be claimed.");
  }

  const contract = getWriteContract(wallet.account);
  const call = contract.populate("claim_dare", { dare_id: dareId });
  const response = await wallet.account.execute([call]);
  const provider = getProvider();
  await provider.waitForTransaction(response.transaction_hash);
  return response;
}

export async function submitProof(
  wallet: AppWallet,
  dareId: bigint,
  proofUrl: string,
  description: string
) {
  const contract = getWriteContract(wallet.account);
  const call = contract.populate("submit_proof", {
    dare_id: dareId,
    proof_url: proofUrl,
    proof_description: description,
  });
  const response = await wallet.account.execute([call]);
  const provider = getProvider();
  await provider.waitForTransaction(response.transaction_hash);
  return response;
}

export async function castVote(wallet: AppWallet, dareId: bigint, approve: boolean) {
  const contract = getWriteContract(wallet.account);
  const call = contract.populate("cast_vote", { dare_id: dareId, approve });
  const response = await wallet.account.execute([call]);
  const provider = getProvider();
  await provider.waitForTransaction(response.transaction_hash);
  return response;
}

export async function finalizeDare(walletOrAccount: AppWallet | Account, dareId: bigint) {
  const account = "account" in walletOrAccount ? walletOrAccount.account : walletOrAccount;
  const contract = getWriteContract(account);
  const call = contract.populate("finalize_dare", { dare_id: dareId });
  const response = await account.execute([call]);
  const provider = getProvider();
  await provider.waitForTransaction(response.transaction_hash);
  return response;
}

// ── Utility exports ──────────────────────────────────────────────────

export function getSupportedTokens(): TokenInfo[] {
  return [TOKENS.STRK, TOKENS.ETH];
}

export function getExplorerTransactionUrl(hash: string) {
  return `https://sepolia.voyager.online/tx/${hash}`;
}

export function getExplorerContractUrl(address: string) {
  return `https://sepolia.voyager.online/contract/${address}`;
}

export function isContractConfigured() {
  return Boolean(CONTRACT_ADDRESS);
}

export function toApiDarePayload(dare: Dare) {
  return { ...dare, id: dare.id.toString() };
}

export function parseApiDarePayload(payload: Record<string, unknown>): Dare {
  return { ...payload, id: BigInt(String(payload.id ?? 0)) } as Dare;
}

export function safeParseJson<T>(value: string): T {
  return json.parse(value) as T;
}
