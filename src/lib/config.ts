import { sepoliaTokens, mainnetTokens } from "starkzap";

// ─── Network ──────────────────────────────────────────────────────────────────

export const STARKNET_NETWORK =
  process.env.NEXT_PUBLIC_STARKNET_NETWORK as "mainnet" | "sepolia";

export const EXPECTED_CHAIN_ID =
  STARKNET_NETWORK === "mainnet"
    ? "0x534e5f4d41494e"       // SN_MAIN
    : "0x534e5f5345504f4c4941"; // SN_SEPOLIA

// ─── RPC & Contract ───────────────────────────────────────────────────────────

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;

export const RPC_URLS = [
  process.env.NEXT_PUBLIC_RPC_URL!,                          // Alchemy (primary)
  "https://starknet-sepolia.public.blastapi.io",             // BlastAPI
  "https://free-rpc.nethermind.io/sepolia-juno",             // Nethermind
];

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

// Previous contract deployments — dares shown read-only (comma-separated in env)
export const LEGACY_CONTRACT_ADDRESSES: string[] =
  (process.env.NEXT_PUBLIC_LEGACY_CONTRACTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter((addr) => addr && addr.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase());

// ─── Explorer ─────────────────────────────────────────────────────────────────

export const STARKSCAN_URL =
  STARKNET_NETWORK === "mainnet"
    ? "https://starkscan.co"
    : `https://${STARKNET_NETWORK}.starkscan.co`;

// ─── Tokens ───────────────────────────────────────────────────────────────────

const _network = (process.env.NEXT_PUBLIC_STARKNET_NETWORK ?? "sepolia") as "sepolia" | "mainnet";
const _tokenPresets = _network === "mainnet" ? mainnetTokens : sepoliaTokens;

// Hardcoded fallback addresses (same on both networks for STRK/ETH)
const _STRK_FALLBACK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const _ETH_FALLBACK  = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export const TOKENS = {
  STRK: String(_tokenPresets.STRK?.address ?? _STRK_FALLBACK),
  ETH:  String(_tokenPresets.ETH?.address  ?? _ETH_FALLBACK),
  USDC: String(_tokenPresets.USDC?.address ?? ""),
  USDT: String(_tokenPresets.USDT?.address ?? ""),
  WBTC: String(_tokenPresets.WBTC?.address ?? ""),
} as const;

// Build TOKEN_SYMBOLS from presets.
// Only include entries where an address and symbol are present.
export const TOKEN_SYMBOLS: Record<string, string> = Object.fromEntries(
  Object.values(_tokenPresets)
    .filter((t) => t.address && t.symbol)
    .map((t) => [String(t.address).toLowerCase(), t.symbol]),
);

// Ensure the hardcoded fallbacks are always present even if presets differ
TOKEN_SYMBOLS[_STRK_FALLBACK] = "STRK";
TOKEN_SYMBOLS[_ETH_FALLBACK]  = "ETH";

// ─── Token decimals ───────────────────────────────────────────────────────────

const _TOKEN_DECIMALS: Record<string, number> = Object.fromEntries(
  Object.values(_tokenPresets)
    .filter((t) => t.address)
    .map((t) => [String(t.address).toLowerCase(), t.decimals]),
);

export function getTokenDecimals(address: string): number {
  if (!address) return 18;
  return _TOKEN_DECIMALS[address.toLowerCase()] ?? 18;
}

export const ZERO_ADDRESS = `0x${"0".repeat(64)}`;

// Admin address — only this wallet can access /admin and delist/relist dares
export const ADMIN_ADDRESS = "0x04B67aB7a04436415873A276F57661E252755B392e8c953cEc9D65905ebcF220";

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
  decimals = 18,
): string {
  if (value === null || value === undefined) return "0";

  try {
    const divisor = 10 ** decimals;
    const amount = Number(BigInt(value.toString())) / divisor;
    return amount.toFixed(amount < 0.01 ? 6 : 2);
  } catch {
    return "0";
  }
}
