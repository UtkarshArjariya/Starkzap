/**
 * contract.js — All read + write helpers for the DareBoard contract
 *
 * Reads:  use starknet.js Contract class (auto-decodes via ABI)
 * Writes: use wallet.execute() (Starkzap-compatible interface)
 */

import {
  RpcProvider,
  Contract,
  CallData,
  shortString,
  uint256,
  byteArray,
  num,
} from "starknet";
import DARE_BOARD_ABI from "./abi.json";
import { RPC_URL, CONTRACT_ADDRESS, TOKENS } from "./config";

export { TOKENS };

// ─── Provider (read-only) ──────────────────────────────────────────────────
let _provider = null;
function getProvider() {
  if (!_provider) {
    _provider = new RpcProvider({ nodeUrl: RPC_URL });
  }
  return _provider;
}

// ─── Contract instance (read-only) ────────────────────────────────────────
function getContract() {
  if (!CONTRACT_ADDRESS) throw new Error("REACT_APP_CONTRACT_ADDRESS not set");
  return new Contract(DARE_BOARD_ABI, CONTRACT_ADDRESS, getProvider());
}

// ─── Status mapping ────────────────────────────────────────────────────────
const STATUS_MAP = {
  0: "Open",
  1: "Claimed",
  2: "Voting",
  3: "Approved",
  4: "Rejected",
  5: "Expired",
};

function decodeStatus(raw) {
  if (raw === null || raw === undefined) return "Open";
  // Cairo enum comes as CairoCustomEnum or BigInt
  if (typeof raw === "object" && raw !== null) {
    if (raw.activeVariant) return raw.activeVariant();
    // Try numeric variant
    const keys = Object.keys(raw);
    if (keys.length > 0 && raw[keys[0]] !== undefined) return keys[0];
  }
  return STATUS_MAP[Number(raw)] ?? "Open";
}

function decodeAddress(raw) {
  if (!raw) return "0x0";
  try {
    return "0x" + BigInt(raw.toString()).toString(16).padStart(64, "0");
  } catch {
    return "0x0";
  }
}

function decodeU64(raw) {
  if (raw === undefined || raw === null) return 0;
  try { return Number(BigInt(raw.toString())); } catch { return 0; }
}

function decodeBigInt(raw) {
  if (raw === undefined || raw === null) return 0n;
  try { return BigInt(raw.toString()); } catch { return 0n; }
}

function decodeU256(raw) {
  if (!raw) return 0n;
  try {
    if (typeof raw === "object" && "low" in raw && "high" in raw) {
      return uint256.uint256ToBN(raw);
    }
    return BigInt(raw.toString());
  } catch { return 0n; }
}

function decodeByteArray(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  try {
    return byteArray.stringFromByteArray(raw);
  } catch {
    return raw?.toString?.() ?? "";
  }
}

function decodeFelt252(raw) {
  if (!raw) return "";
  try {
    return shortString.decodeShortString(raw.toString());
  } catch {
    return raw?.toString?.() ?? "";
  }
}

function decodeDare(raw, id) {
  return {
    id:               BigInt(id ?? raw.id ?? 0),
    poster:           decodeAddress(raw.poster),
    title:            decodeFelt252(raw.title),
    description:      decodeByteArray(raw.description),
    rewardToken:      decodeAddress(raw.reward_token),
    rewardAmount:     decodeU256(raw.reward_amount),
    deadline:         decodeU64(raw.deadline),
    claimer:          decodeAddress(raw.claimer),
    proofUrl:         decodeByteArray(raw.proof_url),
    proofDescription: decodeByteArray(raw.proof_description),
    proofSubmittedAt: decodeU64(raw.proof_submitted_at),
    votingEnd:        decodeU64(raw.voting_end),
    approveVotes:     decodeU64(raw.approve_votes),
    rejectVotes:      decodeU64(raw.reject_votes),
    status:           decodeStatus(raw.status),
  };
}

// ─── Read helpers ──────────────────────────────────────────────────────────
export async function getDareCount() {
  const contract = getContract();
  const result = await contract.get_dare_count();
  return BigInt(result.toString());
}

export async function getDare(dareId) {
  const contract = getContract();
  const raw = await contract.get_dare(dareId);
  return decodeDare(raw, dareId);
}

export async function getAllDares() {
  const count = Number(await getDareCount());
  if (count === 0) return [];
  const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));
  const dares = await Promise.all(ids.map(getDare));
  return dares.reverse(); // newest first
}

export async function hasVoterVoted(dareId, voter) {
  const contract = getContract();
  const result = await contract.has_voter_voted(dareId, voter);
  return Boolean(result);
}

// ─── Write helpers (all use wallet.execute) ───────────────────────────────

/**
 * Create a dare. Multicall: ERC20 approve + create_dare
 */
export async function createDare(wallet, params) {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract not deployed yet. Set REACT_APP_CONTRACT_ADDRESS in frontend/.env");
  }
  if (!params.rewardToken || params.rewardToken === "0x") {
    throw new Error("Invalid reward token address");
  }

  const amountFloat = parseFloat(params.rewardAmount);
  if (!amountFloat || amountFloat <= 0) {
    throw new Error("Reward amount must be greater than 0");
  }

  const amountWei = BigInt(Math.round(amountFloat * 1e18));
  const amountU256 = uint256.bnToUint256(amountWei);
  const deadlineTs = Math.floor(new Date(params.deadline).getTime() / 1000);

  const callData = new CallData(DARE_BOARD_ABI);

  const createDareCalldata = callData.compile("create_dare", {
    title:        shortString.encodeShortString(params.title.slice(0, 31)),
    description:  params.description,
    reward_token: params.rewardToken,
    reward_amount: amountU256,
    deadline:     deadlineTs,
  });

  // ERC20 approve calldata (manual for minimal ERC20 ABI)
  const approveCalldata = CallData.compile({
    spender: CONTRACT_ADDRESS,
    amount:  amountU256,
  });

  const tx = await wallet.execute([
    {
      contractAddress: params.rewardToken,
      entrypoint:      "approve",
      calldata:        approveCalldata,
    },
    {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint:      "create_dare",
      calldata:        createDareCalldata,
    },
  ]);
  return tx.transaction_hash;
}

export async function claimDare(wallet, dareId) {
  const callData = new CallData(DARE_BOARD_ABI);
  const calldata = callData.compile("claim_dare", { dare_id: dareId });
  const tx = await wallet.execute([
    { contractAddress: CONTRACT_ADDRESS, entrypoint: "claim_dare", calldata },
  ]);
  return tx.transaction_hash;
}

export async function submitProof(wallet, dareId, proofUrl, proofDescription) {
  const callData = new CallData(DARE_BOARD_ABI);
  const calldata = callData.compile("submit_proof", {
    dare_id:          dareId,
    proof_url:        proofUrl,
    proof_description: proofDescription,
  });
  const tx = await wallet.execute([
    { contractAddress: CONTRACT_ADDRESS, entrypoint: "submit_proof", calldata },
  ]);
  return tx.transaction_hash;
}

export async function castVote(wallet, dareId, approve) {
  const callData = new CallData(DARE_BOARD_ABI);
  const calldata = callData.compile("cast_vote", {
    dare_id: dareId,
    approve,
  });
  const tx = await wallet.execute([
    { contractAddress: CONTRACT_ADDRESS, entrypoint: "cast_vote", calldata },
  ]);
  return tx.transaction_hash;
}

export async function finalizeDare(wallet, dareId) {
  const callData = new CallData(DARE_BOARD_ABI);
  const calldata = callData.compile("finalize_dare", { dare_id: dareId });
  const tx = await wallet.execute([
    { contractAddress: CONTRACT_ADDRESS, entrypoint: "finalize_dare", calldata },
  ]);
  return tx.transaction_hash;
}
