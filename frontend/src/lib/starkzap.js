/**
 * starkzap.js — Wallet connection layer
 *
 * Two modes:
 *  1. Browser extension  — Braavos / Argent X via getStarknet() (no MetaMask modal)
 *  2. Direct key         — starknet.js Account(provider, address, privateKey)
 */

import { getStarknet } from "@starknet-io/get-starknet-core";
import { Account, RpcProvider } from "starknet";
import { RPC_URL } from "./config";

// Starknet-only wallet IDs — explicitly exclude EVM wallets
const STARKNET_WALLET_IDS = ["braavos", "argentX", "argent"];

function makeWalletObj(address, executeFn, starknetObj = null) {
  return { address, execute: executeFn, starknet: starknetObj };
}

/** List installed Starknet-native wallets (no MetaMask) */
export async function getInstalledWallets() {
  try {
    const gsw = getStarknet({ windowObject: window });
    const all = await gsw.getAvailableWallets();
    // Filter to only Starknet wallets
    return all.filter((w) =>
      STARKNET_WALLET_IDS.some((id) => w.id?.toLowerCase().includes(id.toLowerCase()))
    );
  } catch {
    return [];
  }
}

/** Connect to a specific browser-extension wallet object */
export async function connectExtensionWallet(walletObj) {
  const gsw = getStarknet({ windowObject: window });
  const enabled = await gsw.enable(walletObj, { starknetVersion: "v5" });
  const address = enabled.selectedAddress || enabled.account?.address;
  if (!address) throw new Error("Wallet enabled but no address returned");
  return makeWalletObj(
    address,
    async (calls) => {
      const res = await enabled.account.execute(calls);
      return { transaction_hash: res.transaction_hash };
    },
    enabled
  );
}

/** Connect with a raw private key — dev / direct mode */
export async function connectWithPrivateKey(address, privateKey) {
  if (!address || !privateKey)
    throw new Error("Address and private key are required");
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, address, privateKey);
  // Verify the account exists on-chain (optional sanity check)
  return makeWalletObj(address, async (calls) => {
    const res = await account.execute(calls);
    return { transaction_hash: res.transaction_hash };
  });
}

/** Try to restore last connected wallet silently on page load */
export async function getConnectedWallet() {
  try {
    const gsw = getStarknet({ windowObject: window });
    const last = await gsw.getLastConnectedWallet();
    if (!last) return null;
    const enabled = await gsw.enable(last, { starknetVersion: "v5" });
    if (!enabled?.selectedAddress) return null;
    return makeWalletObj(
      enabled.selectedAddress,
      async (calls) => {
        const res = await enabled.account.execute(calls);
        return { transaction_hash: res.transaction_hash };
      },
      enabled
    );
  } catch {
    return null;
  }
}

export async function disconnectWallet() {
  try {
    const gsw = getStarknet({ windowObject: window });
    await gsw.disconnect({ clearLastWallet: true });
  } catch {
    // ignore
  }
}

