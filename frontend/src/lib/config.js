// Starknet Sepolia token addresses
export const TOKENS = {
  STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  ETH:  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
};

export const TOKEN_SYMBOLS = {
  [TOKENS.STRK.toLowerCase()]: "STRK",
  [TOKENS.ETH.toLowerCase()]:  "ETH",
};

export function getTokenSymbol(address) {
  if (!address) return "TOKEN";
  return TOKEN_SYMBOLS[address.toLowerCase()] || "TOKEN";
}

export const RPC_URL =
  process.env.REACT_APP_RPC_URL ||
  "https://starknet-sepolia-rpc.publicnode.com";

export const CONTRACT_ADDRESS =
  process.env.REACT_APP_CONTRACT_ADDRESS || "";

export const STARKSCAN_URL = "https://sepolia.starkscan.co";

export function shortAddress(addr) {
  if (!addr) return "";
  const hex = addr.toString(16).padStart(64, "0");
  return `0x${hex.slice(0, 4)}...${hex.slice(-4)}`;
}

export function formatAmount(bigintWei) {
  if (bigintWei === undefined || bigintWei === null) return "0";
  try {
    const val = Number(BigInt(bigintWei.toString())) / 1e18;
    return val.toFixed(val < 0.01 ? 6 : 2);
  } catch {
    return "0";
  }
}

export function normalizeAddress(addr) {
  if (!addr) return "0x0";
  try {
    return "0x" + BigInt(addr.toString()).toString(16).padStart(64, "0");
  } catch {
    return addr;
  }
}

export function addressesMatch(a, b) {
  if (!a || !b) return false;
  try {
    return BigInt(a.toString()) === BigInt(b.toString());
  } catch {
    return false;
  }
}
