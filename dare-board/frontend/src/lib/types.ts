export type DareStatus =
  | "Open"
  | "Claimed"
  | "Voting"
  | "Approved"
  | "Rejected"
  | "Expired";

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
}

export interface InstalledWallet {
  id?: string;
  name?: string;
  icon?: string | { dark: string; light: string };
  [key: string]: unknown;
}

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
}
