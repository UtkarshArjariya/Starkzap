import {
  byteArray,
  CallData,
  Contract,
  RpcProvider,
  shortString,
  uint256,
} from "starknet";
import DARE_BOARD_ABI from "@/lib/abi.json";
import { CONTRACT_ADDRESS, LEGACY_CONTRACT_ADDRESSES, RPC_URL } from "@/lib/config";
import type { CreateDareParams, Dare, WalletAccount } from "@/lib/types";

export { TOKENS } from "@/lib/config";

// ─── Provider / Contract singletons ──────────────────────────────────────────

let provider: RpcProvider | null = null;

function getProvider(): RpcProvider {
  if (!provider) {
    provider = new RpcProvider({ nodeUrl: RPC_URL, blockIdentifier: "latest" });
  }
  return provider;
}

function getContract(): Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Add it to your .env.local file.",
    );
  }
  return new Contract(DARE_BOARD_ABI, CONTRACT_ADDRESS, getProvider());
}

// ─── Decoders ─────────────────────────────────────────────────────────────────

const STATUS_NAME_MAP: Record<string, Dare["status"]> = {
  Open: "Open",
  Claimed: "Claimed",
  Voting: "Voting",
  Approved: "Approved",
  Rejected: "Rejected",
  Expired: "Expired",
};

function decodeStatus(raw: unknown): Dare["status"] {
  if (raw && typeof raw === "object") {
    const asObj = raw as Record<string, unknown>;

    // starknet.js v6 returns a CairoCustomEnum instance.
    // MUST call activeVariant() as a method on the object so that
    // `this` stays bound — extracting it to a variable loses `this`
    // in strict mode and crashes with "Cannot read properties of
    // undefined (reading 'variant')".
    if (typeof asObj["activeVariant"] === "function") {
      try {
        const name = (asObj as { activeVariant: () => string }).activeVariant();
        return STATUS_NAME_MAP[name] ?? "Open";
      } catch {
        // fall through to variant-object check below
      }
    }

    // Fallback: read the CairoCustomEnum `variant` object directly.
    // Shape: { Open: undefined, Claimed: {}, Voting: undefined, … }
    // The active variant is the first entry whose value is not undefined.
    if (asObj["variant"] && typeof asObj["variant"] === "object") {
      const entries = Object.entries(
        asObj["variant"] as Record<string, unknown>,
      );
      const active = entries.find(([, v]) => v !== undefined);
      if (active) return STATUS_NAME_MAP[active[0]] ?? "Open";
    }
  }

  // Legacy numeric encoding (0 = Open, 1 = Claimed, …)
  const key = Number((raw as { toString?: () => string })?.toString?.() ?? raw);
  const numericMap: Record<number, Dare["status"]> = {
    0: "Open",
    1: "Claimed",
    2: "Voting",
    3: "Approved",
    4: "Rejected",
    5: "Expired",
  };
  return numericMap[key] ?? "Open";
}

function decodeAddress(raw: unknown): string {
  try {
    return `0x${BigInt(raw?.toString?.() || 0)
      .toString(16)
      .padStart(64, "0")}`;
  } catch {
    return `0x${"0".repeat(64)}`;
  }
}

function decodeU64(raw: unknown): number {
  try {
    return Number(BigInt(raw?.toString?.() || 0));
  } catch {
    return 0;
  }
}

function decodeU256(raw: unknown): bigint {
  try {
    if (
      raw &&
      typeof raw === "object" &&
      "low" in (raw as Record<string, unknown>) &&
      "high" in (raw as Record<string, unknown>)
    ) {
      return uint256.uint256ToBN(raw as { low: string; high: string });
    }
    return BigInt(raw?.toString?.() || 0);
  } catch {
    return 0n;
  }
}

function decodeByteArray(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  try {
    return byteArray.stringFromByteArray(
      raw as Parameters<typeof byteArray.stringFromByteArray>[0],
    );
  } catch {
    return raw?.toString?.() || "";
  }
}

function decodeFelt(raw: unknown): string {
  if (!raw) return "";
  try {
    // Pass a hex string so decodeShortString never calls Number() internally,
    // which would lose precision for large felt252 values.
    const hex =
      typeof raw === "bigint" ? `0x${raw.toString(16)}` : raw.toString();
    return shortString.decodeShortString(hex);
  } catch {
    return raw?.toString?.() || "";
  }
}

function decodeDare(
  raw: Record<string, unknown>,
  id?: bigint,
  contractAddr?: string,
  legacy?: boolean,
): Dare {
  return {
    id: BigInt(id ?? raw.id?.toString?.() ?? 0),
    poster: decodeAddress(raw.poster),
    title: decodeFelt(raw.title),
    description: decodeByteArray(raw.description),
    rewardToken: decodeAddress(raw.reward_token),
    rewardAmount: decodeU256(raw.reward_amount),
    deadline: decodeU64(raw.deadline),
    claimer: decodeAddress(raw.claimer),
    proofUrl: decodeByteArray(raw.proof_url),
    proofDescription: decodeByteArray(raw.proof_description),
    proofSubmittedAt: decodeU64(raw.proof_submitted_at),
    votingEnd: decodeU64(raw.voting_end),
    approveVotes: decodeU64(raw.approve_votes),
    rejectVotes: decodeU64(raw.reject_votes),
    status: decodeStatus(raw.status),
    contractAddress: contractAddr,
    legacy: legacy ?? false,
  };
}

// ─── Legacy contract helpers ─────────────────────────────────────────────────

function getLegacyContract(address: string): Contract {
  return new Contract(DARE_BOARD_ABI, address, getProvider());
}

async function getLegacyDares(): Promise<Dare[]> {
  const results: Dare[] = [];

  for (const addr of LEGACY_CONTRACT_ADDRESSES) {
    try {
      const legacy = getLegacyContract(addr);
      const count = Number(BigInt((await legacy.get_dare_count()).toString()));
      if (count === 0) continue;

      const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));
      const dares = await Promise.all(
        ids.map(async (id) => {
          try {
            const raw = (await legacy.get_dare(id)) as Record<string, unknown>;
            return decodeDare(raw, id, addr, true);
          } catch {
            return null;
          }
        }),
      );
      results.push(...dares.filter((d): d is Dare => d !== null));
    } catch {
      // Legacy contract unreachable — skip silently
    }
  }

  return results;
}

// ─── Read functions ───────────────────────────────────────────────────────────

export async function getDareCount(): Promise<bigint> {
  const contract = getContract();
  const result = await contract.get_dare_count();
  return BigInt(result.toString());
}

export async function getDare(dareId: bigint, contractAddr?: string): Promise<Dare> {
  const isLegacy = contractAddr && contractAddr.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase();
  const contract = isLegacy
    ? getLegacyContract(contractAddr)
    : getContract();
  const raw = (await contract.get_dare(dareId)) as Record<string, unknown>;
  return decodeDare(raw, dareId, contractAddr ?? CONTRACT_ADDRESS, !!isLegacy);
}

export async function getAllDares(): Promise<Dare[]> {
  // Fetch from current + legacy contracts in parallel
  const [currentDares, legacyDares] = await Promise.all([
    (async () => {
      const count = Number(await getDareCount());
      if (count === 0) return [];
      const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));
      return Promise.all(ids.map((id) => getDare(id)));
    })(),
    getLegacyDares(),
  ]);

  // Sort all dares by deadline (newest first)
  return [...currentDares, ...legacyDares].sort(
    (a, b) => b.deadline - a.deadline,
  );
}

export async function getDaresPaginated(
  page: number,
  pageSize = 20,
): Promise<{ dares: Dare[]; total: number; hasMore: boolean }> {
  // Fetch current contract dares
  const currentTotal = Number(await getDareCount());
  const currentDares: Dare[] = [];
  if (currentTotal > 0) {
    const endId = Math.max(1, currentTotal - (page - 1) * pageSize);
    const startId = Math.max(1, endId - pageSize + 1);
    const ids = Array.from(
      { length: endId - startId + 1 },
      (_, i) => BigInt(startId + i),
    );
    currentDares.push(
      ...(await Promise.all(ids.map((id) => getDare(id)))).reverse(),
    );
  }

  // On page 1, also fetch legacy dares (they don't paginate — usually small)
  let legacyDares: Dare[] = [];
  if (page === 1) {
    legacyDares = await getLegacyDares();
  }

  const allDares = [...currentDares, ...legacyDares].sort(
    (a, b) => b.deadline - a.deadline,
  );

  const total = currentTotal + legacyDares.length;
  return { dares: allDares, total, hasMore: currentTotal > page * pageSize };
}

export async function hasVoterVoted(
  dareId: bigint,
  voter: string,
  contractAddr?: string,
): Promise<boolean> {
  const isLegacy = contractAddr && contractAddr.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase();
  const contract = isLegacy
    ? getLegacyContract(contractAddr)
    : getContract();
  const result = await contract.has_voter_voted(dareId, voter);
  return Boolean(result);
}

// ─── Write functions ──────────────────────────────────────────────────────────

/**
 * Encode a short string (≤31 chars) to a hex felt252.
 *
 * starknet.js's encodeShortString uses `/./g` which SKIPS newlines,
 * producing broken hex like "0x...7073\n\n506f...".
 * This version iterates every character so \n, \r, etc. are encoded correctly.
 */
function encodeShortStringFixed(str: string): string {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return "0x" + (hex || "0");
}

/**
 * Convert a string to a Cairo ByteArray calldata array.
 * Replacement for starknet.js byteArray.byteArrayFromString which
 * breaks on strings containing newlines (see encodeShortStringFixed).
 */
function stringToByteArrayCalldata(str: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += 31) {
    chunks.push(str.substring(i, i + 31));
  }

  let pendingWord: string;
  let pendingWordLen: number;
  const encodedData: string[] = [];

  if (chunks.length === 0) {
    pendingWord = "0x0";
    pendingWordLen = 0;
  } else {
    const last = chunks[chunks.length - 1];
    if (last.length === 31) {
      // All chunks are full 31-byte words
      for (const c of chunks) encodedData.push(encodeShortStringFixed(c));
      pendingWord = "0x0";
      pendingWordLen = 0;
    } else {
      // Last chunk is partial → becomes pending_word
      for (let i = 0; i < chunks.length - 1; i++) {
        encodedData.push(encodeShortStringFixed(chunks[i]));
      }
      pendingWord = encodeShortStringFixed(last);
      pendingWordLen = last.length;
    }
  }

  return [
    String(encodedData.length),
    ...encodedData,
    pendingWord,
    String(pendingWordLen),
  ];
}

export async function createDare(
  wallet: WalletAccount,
  params: CreateDareParams,
): Promise<string> {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "Contract not deployed yet. Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local.",
    );
  }

  const amount = Number(params.rewardAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Reward amount must be greater than 0.");
  }

  const rewardAmount = BigInt(Math.round(amount * 1e18));
  const rewardAmountU256 = uint256.bnToUint256(rewardAmount);
  const deadline = Math.floor(params.deadline.getTime() / 1000);

  // Use our fixed encoder to avoid starknet.js encodeShortString /./g bug
  // that silently drops newline characters and produces broken hex strings.
  const titleFelt = encodeShortStringFixed(params.title.trim().slice(0, 31));

  const createDareCalldata = [
    titleFelt,
    // ByteArray struct: [data.length, ...data, pending_word, pending_word_len]
    ...stringToByteArrayCalldata(params.description.trim()),
    // reward_token
    params.rewardToken,
    // reward_amount u256 (low, high)
    "0x" + BigInt(rewardAmountU256.low.toString()).toString(16),
    "0x" + BigInt(rewardAmountU256.high.toString()).toString(16),
    // deadline
    "0x" + BigInt(deadline).toString(16),
  ];

  const approveCalldata = [
    CONTRACT_ADDRESS,
    "0x" + BigInt(rewardAmountU256.low.toString()).toString(16),
    "0x" + BigInt(rewardAmountU256.high.toString()).toString(16),
  ];

  const result = await wallet.execute([
    {
      contractAddress: params.rewardToken,
      entrypoint: "approve",
      calldata: approveCalldata,
    },
    {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: "create_dare",
      calldata: createDareCalldata,
    },
  ]);

  return result.transaction_hash;
}

export async function claimDare(
  wallet: WalletAccount,
  dareId: bigint,
): Promise<string> {
  const calldata = new CallData(DARE_BOARD_ABI).compile("claim_dare", {
    dare_id: dareId,
  });

  const result = await wallet.execute([
    {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: "claim_dare",
      calldata,
    },
  ]);

  return result.transaction_hash;
}

export async function submitProof(
  wallet: WalletAccount,
  dareId: bigint,
  proofUrl: string,
  proofDescription: string,
): Promise<string> {
  const calldata = new CallData(DARE_BOARD_ABI).compile("submit_proof", {
    dare_id: dareId,
    proof_url: proofUrl,
    proof_description: proofDescription,
  });

  const result = await wallet.execute([
    {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: "submit_proof",
      calldata,
    },
  ]);

  return result.transaction_hash;
}

export async function castVote(
  wallet: WalletAccount,
  dareId: bigint,
  approve: boolean,
): Promise<string> {
  const calldata = new CallData(DARE_BOARD_ABI).compile("cast_vote", {
    dare_id: dareId,
    approve,
  });

  const result = await wallet.execute([
    {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: "cast_vote",
      calldata,
    },
  ]);

  return result.transaction_hash;
}

export async function finalizeDare(
  wallet: WalletAccount,
  dareId: bigint,
): Promise<string> {
  const calldata = new CallData(DARE_BOARD_ABI).compile("finalize_dare", {
    dare_id: dareId,
  });

  const result = await wallet.execute([
    {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: "finalize_dare",
      calldata,
    },
  ]);

  return result.transaction_hash;
}

export async function cancelDare(
  wallet: WalletAccount,
  dareId: bigint,
): Promise<string> {
  const calldata = new CallData(DARE_BOARD_ABI).compile("cancel_dare", {
    dare_id: dareId,
  });

  const result = await wallet.execute([
    {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: "cancel_dare",
      calldata,
    },
  ]);

  return result.transaction_hash;
}
