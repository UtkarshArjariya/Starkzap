import type { Dare, DareStatus } from "@/lib/types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Normalize a Starknet address to a consistent lowercase hex format.
 * Strips leading zeros after the 0x prefix so that
 * 0x04B6...F220 and 0x4B6...F220 compare as equal.
 */
export function normalizeStarknetAddress(address: string): string {
  if (!address) return "0x0";
  const lower = address.toLowerCase();
  if (!lower.startsWith("0x")) return lower;
  const stripped = lower.slice(2).replace(/^0+/, "") || "0";
  return `0x${stripped}`;
}

/** Compare two Starknet addresses for equality (padding-safe). */
export function addressesEqual(a: string, b: string): boolean {
  return normalizeStarknetAddress(a) === normalizeStarknetAddress(b);
}

export function shortenAddress(address: string, size = 6) {
  if (!address) {
    return "";
  }

  return `${address.slice(0, size)}...${address.slice(-4)}`;
}

export function formatTimestamp(timestamp: number) {
  if (!timestamp) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp * 1000));
}

export function getCountdownLabel(targetTimestamp: number) {
  if (!targetTimestamp) {
    return "Awaiting";
  }

  const diff = targetTimestamp * 1000 - Date.now();
  const isPast = diff <= 0;
  const totalMinutes = Math.abs(Math.floor(diff / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const segments = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    `${minutes}m`
  ].filter(Boolean);

  return isPast ? `${segments.join(" ")} ago` : `in ${segments.join(" ")}`;
}

export function isActiveStatus(status: DareStatus) {
  return status === "Open" || status === "Claimed" || status === "Voting";
}

export function isCompletedStatus(status: DareStatus) {
  return status === "Approved" || status === "Rejected" || status === "Expired";
}

export function matchesFilter(
  dare: Dare,
  filter: "all" | "open" | "claimed" | "voting" | "completed"
) {
  if (filter === "all") {
    return true;
  }
  if (filter === "open") {
    return dare.status === "Open";
  }
  if (filter === "claimed") {
    return dare.status === "Claimed";
  }
  if (filter === "voting") {
    return dare.status === "Voting";
  }
  return isCompletedStatus(dare.status);
}

export function canFinalizeDare(dare: Dare) {
  const now = Math.floor(Date.now() / 1000);

  if (dare.status === "Voting") {
    return now >= dare.votingEnd;
  }

  if (dare.status === "Claimed" || dare.status === "Open") {
    return now > dare.deadline;
  }

  return false;
}
