import { StarknetIdNavigator } from "starknetid.js";
import { RpcProvider, constants } from "starknet";
import { RPC_URL, STARKNET_NETWORK, shortAddress } from "@/lib/config";

const provider = new RpcProvider({ nodeUrl: RPC_URL, blockIdentifier: "latest" });
const chainId =
  STARKNET_NETWORK === "mainnet" ? constants.StarknetChainId.SN_MAIN : constants.StarknetChainId.SN_SEPOLIA;

const navigator = new StarknetIdNavigator(provider, chainId);
const cache = new Map<string, string>();

export async function resolveAddress(address: string): Promise<string> {
  if (!address) return shortAddress(address);
  const key = address.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  try {
    const name = await navigator.getStarkName(address);
    const result = name ?? shortAddress(address);
    cache.set(key, result);
    return result;
  } catch {
    const fallback = shortAddress(address);
    cache.set(key, fallback);
    return fallback;
  }
}
