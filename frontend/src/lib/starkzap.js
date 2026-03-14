/**
 * starkzap.js — Wallet connection wrapper
 *
 * Current implementation: uses @starknet-io/get-starknet for wallet detection
 * (Argent X / Braavos browser extension).
 *
 * To swap in real Starkzap + Privy when REACT_APP_PRIVY_APP_ID is real:
 *   1. npm install starkzap
 *   2. Replace connectWallet() with the StarkSDK / Privy flow
 *   3. The rest of the app uses wallet.execute() — zero changes needed elsewhere.
 *
 * Starkzap planned integration:
 *   import { StarkSDK } from "starkzap";
 *   const sdk = new StarkSDK({
 *     network: "sepolia",
 *     paymaster: { type: "avnu", url: "https://paymaster.avnu.fi" },
 *   });
 *   wallet = await sdk.connectWallet({
 *     auth: { type: "privy", appId: process.env.REACT_APP_PRIVY_APP_ID },
 *   });
 */

import { connect, disconnect as gstDisconnect } from "@starknet-io/get-starknet";

export async function connectWallet() {
  const starknet = await connect({
    modalMode: "alwaysAsk",
    modalTheme: "dark",
  });

  if (!starknet || !starknet.account) {
    throw new Error("No wallet found. Please install Argent X or Braavos.");
  }

  const address = starknet.selectedAddress;

  return {
    address,
    starknet,
    /** wallet.execute(calls) — matches Starkzap's interface exactly */
    execute: async (calls) => {
      const response = await starknet.account.execute(calls);
      return { transaction_hash: response.transaction_hash };
    },
  };
}

export async function disconnectWallet() {
  await gstDisconnect({ clearLastWallet: true });
}

export async function getConnectedWallet() {
  const starknet = await connect({ modalMode: "neverAsk" });
  if (!starknet || !starknet.isConnected || !starknet.selectedAddress) {
    return null;
  }
  const address = starknet.selectedAddress;
  return {
    address,
    starknet,
    execute: async (calls) => {
      const response = await starknet.account.execute(calls);
      return { transaction_hash: response.transaction_hash };
    },
  };
}
