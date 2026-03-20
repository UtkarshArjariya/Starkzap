import type { StarknetWindowObject } from "@starknet-io/types-js";

export type DareStatus =
  | "Open"
  | "Claimed"
  | "Voting"
  | "Approved"
  | "Rejected"
  | "Expired"
  | "Cancelled";

export interface Dare {
  id: bigint;
  poster: string;
  title: string;
  description: string;
  rewardToken: string;
  rewardAmount: bigint;
  deadline: number;
  claimer: string;
  proofUrl: string;
  proofDescription: string;
  proofSubmittedAt: number;
  votingEnd: number;
  approveVotes: number;
  rejectVotes: number;
  status: DareStatus;
  /** The contract this dare lives on */
  contractAddress?: string;
  /** True if from a legacy (previous) contract — read-only, no interactions */
  legacy?: boolean;
}

export interface CreateDareParams {
  title: string;
  description: string;
  rewardToken: string;
  rewardAmount: string;
  deadline: Date;
}

export interface WalletCall {
  contractAddress: string;
  entrypoint: string;
  calldata: unknown[];
}

export interface WalletTransactionResult {
  transaction_hash: string;
}

export interface WalletAccount {
  address: string;
  execute(calls: WalletCall[]): Promise<WalletTransactionResult>;
  starknet?: unknown;
  chainId?: string;
}

// InstalledWallet is the subset of StarknetWindowObject we work with.
// It maps directly to what getAvailableWallets() returns in
// @starknet-io/get-starknet-core v4.
export type InstalledWallet = StarknetWindowObject;

export interface SerializedDare {
  id: string;
  poster: string;
  title: string;
  description: string;
  rewardToken: string;
  rewardAmount: string;
  deadline: number;
  claimer: string;
  proofUrl: string;
  proofDescription: string;
  proofSubmittedAt: number;
  votingEnd: number;
  approveVotes: number;
  rejectVotes: number;
  status: DareStatus;
  contractAddress?: string;
  legacy?: boolean;
}
