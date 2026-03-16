// ─── Network ──────────────────────────────────────────────────────────────────

export const STARKNET_NETWORK =
  (process.env.NEXT_PUBLIC_STARKNET_NETWORK as "mainnet" | "sepolia") ||
  "sepolia";

// ─── RPC & Contract ───────────────────────────────────────────────────────────

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://starknet-sepolia.drpc.org";

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

// ─── Explorer ─────────────────────────────────────────────────────────────────

export const STARKSCAN_URL =
  process.env.NEXT_PUBLIC_STARKSCAN_URL ||
  (STARKNET_NETWORK === "mainnet"
    ? "https://starkscan.co"
    : `https://${STARKNET_NETWORK}.starkscan.co`);

// ─── Tokens ───────────────────────────────────────────────────────────────────

export const TOKENS = {
  STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
} as const;

export const TOKEN_SYMBOLS: Record<string, string> = {
  [TOKENS.STRK.toLowerCase()]: "STRK",
  [TOKENS.ETH.toLowerCase()]: "ETH",
};

export const ZERO_ADDRESS = `0x${"0".repeat(64)}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTokenSymbol(address: string): string {
  if (!address) return "TOKEN";
  return TOKEN_SYMBOLS[address.toLowerCase()] || "TOKEN";
}

export function normalizeAddress(
  address: string | bigint | null | undefined,
): string {
  if (address === null || address === undefined || address === "") {
    return ZERO_ADDRESS;
  }

  try {
    const normalized = BigInt(address.toString())
      .toString(16)
      .padStart(64, "0");
    return `0x${normalized}`;
  } catch {
    return typeof address === "string" ? address.toLowerCase() : ZERO_ADDRESS;
  }
}

export function addressesMatch(
  left: string | bigint | null | undefined,
  right: string | bigint | null | undefined,
): boolean {
  if (!left || !right) return false;

  try {
    return BigInt(left.toString()) === BigInt(right.toString());
  } catch {
    return normalizeAddress(left) === normalizeAddress(right);
  }
}

export function shortAddress(
  address: string | bigint | null | undefined,
): string {
  const normalized = normalizeAddress(address);
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

export function formatAmount(
  value: bigint | string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "0";

  try {
    const amount = Number(BigInt(value.toString())) / 1e18;
    return amount.toFixed(amount < 0.01 ? 6 : 2);
  } catch {
    return "0";
  }
}
