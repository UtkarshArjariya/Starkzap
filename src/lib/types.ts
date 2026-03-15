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
  rewardAmount: string;
  rewardAmountFormatted: string;
  rewardSymbol: string;
  deadline: number;
  claimer: string;
  proofUrl: string;
  proofDescription: string;
  proofSubmittedAt: number;
  votingEnd: number;
  approveVotes: number;
  rejectVotes: number;
  status: DareStatus;
  userHasVoted?: boolean;
}

export interface CreateDareParams {
  title: string;
  description: string;
  rewardToken: string;
  rewardAmount: string;
  deadline: Date;
}

export interface ProofSubmissionParams {
  proofUrl: string;
  proofDescription: string;
}

export interface DareFilterOption {
  id: "all" | "open" | "claimed" | "voting" | "completed";
  label: string;
}
