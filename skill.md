# SKILL: Build Dare Board on Starknet

## Overview
You are building **Dare Board** — a full-stack decentralized application on Starknet Sepolia. Users post dares with token rewards locked in escrow. Others claim dares, submit proof, and the community votes to release or refund the reward. Everything is gasless via Starkzap + AVNU Paymaster. No seed phrases, no wallets — just passkey/social login.

**Language:** TypeScript only (everywhere — Next.js, scripts, tests).
**Framework:** Next.js 14 App Router.
**Blockchain:** Starknet Sepolia Testnet.
**Contract Language:** Cairo 2.x (Scarb).
**Wallet SDK:** Starkzap (`npm install starkzap`).

---

## Step 0: Understand the Wallet Setup

The deployer wallet is a Braavos wallet on Starknet Sepolia:
- `DEPLOYER_PUBLIC_KEY=0x031e44081b9c32225b810e1575f70cb39d08ed9e66061c1cbef1e553b84d8886`
- `DEPLOYER_PRIVATE_KEY=0x00e6d4c153062a9191cedcb0521ecc7772481a95b99c21da5fe1c1133f825ff2`

Store these in `.env.local`. Use them ONLY in server-side code (deploy script + API routes). Never expose to the browser.

---

## Step 1: Project Initialization

```bash
npx create-next-app@latest dare-board --typescript --tailwind --app --no-src-dir
cd dare-board
npm install starkzap starknet@^9 @cartridge/controller
npm install -D @types/node
```

Create `.env.local`:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=                          # fill after deploy
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
NEXT_PUBLIC_RPC_URL=https://starknet-sepolia.public.blastapi.io
DEPLOYER_PUBLIC_KEY=0x031e44081b9c32225b810e1575f70cb39d08ed9e66061c1cbef1e553b84d8886
DEPLOYER_PRIVATE_KEY=0x00e6d4c153062a9191cedcb0521ecc7772481a95b99c21da5fe1c1133f825ff2
NEXT_PUBLIC_PRIVY_APP_ID=                              # from privy.io dashboard
```

---

## Step 2: Cairo Smart Contract

### 2.1 Initialize Scarb project

```bash
mkdir contracts && cd contracts
scarb init --name dare_board
```

### 2.2 `Scarb.toml`

```toml
[package]
name = "dare_board"
version = "0.1.0"
edition = "2024_07"

[dependencies]
starknet = ">=2.8.0"
openzeppelin = { git = "https://github.com/OpenZeppelin/cairo-contracts.git", tag = "v0.15.0" }

[[target.starknet-contract]]
sierra = true
casm = true
```

### 2.3 `src/lib.cairo`

```cairo
pub mod dare_board;
```

### 2.4 `src/dare_board.cairo` — Full Contract

Write the complete Cairo contract with:

**Enums:**
```cairo
#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
enum DareStatus {
    Open,
    Claimed,
    Voting,
    Approved,
    Rejected,
    Expired,
}
```

**Dare struct** with all fields: `id`, `poster`, `title` (ByteArray), `description` (ByteArray), `reward_token` (ContractAddress), `reward_amount` (u256), `deadline` (u64), `claimer` (ContractAddress), `proof_url` (ByteArray), `proof_description` (ByteArray), `proof_submitted_at` (u64), `voting_end` (u64), `approve_votes` (u64), `reject_votes` (u64), `status` (DareStatus).

**Storage:**
```cairo
#[storage]
struct Storage {
    dares: LegacyMap<u64, Dare>,
    dare_count: u64,
    has_voted: LegacyMap<(u64, ContractAddress), bool>,
    owner: ContractAddress,
}
```

**Constructor:**
```cairo
#[constructor]
fn constructor(ref self: ContractState, owner: ContractAddress) {
    self.owner.write(owner);
    self.dare_count.write(0);
}
```

**Events:**
```cairo
#[event]
#[derive(Drop, starknet::Event)]
enum Event {
    DareCreated: DareCreated,
    DareClaimed: DareClaimed,
    ProofSubmitted: ProofSubmitted,
    VoteCast: VoteCast,
    DareFinalized: DareFinalized,
}

#[derive(Drop, starknet::Event)] struct DareCreated  { dare_id: u64, poster: ContractAddress, reward_amount: u256 }
#[derive(Drop, starknet::Event)] struct DareClaimed  { dare_id: u64, claimer: ContractAddress }
#[derive(Drop, starknet::Event)] struct ProofSubmitted { dare_id: u64, claimer: ContractAddress }
#[derive(Drop, starknet::Event)] struct VoteCast     { dare_id: u64, voter: ContractAddress, approve: bool }
#[derive(Drop, starknet::Event)] struct DareFinalized { dare_id: u64, status: DareStatus }
```

**`create_dare` logic:**
1. Assert `deadline > starknet::get_block_timestamp() + 3600`.
2. Transfer `reward_amount` of `reward_token` from caller to `get_contract_address()` using IERC20 `transfer_from`.
3. Increment `dare_count`, build Dare struct with status `Open`, write to `dares`.
4. Emit `DareCreated`.
5. Return new dare ID.

**`claim_dare` logic:**
1. Read dare, assert status == `Open`.
2. Assert caller != poster.
3. Assert `get_block_timestamp() < dare.deadline`.
4. Set `dare.claimer = caller`, status → `Claimed`.
5. Write back, emit `DareClaimed`.

**`submit_proof` logic:**
1. Read dare, assert caller == `dare.claimer`.
2. Assert status == `Claimed`.
3. Set `proof_url`, `proof_description`, `proof_submitted_at = get_block_timestamp()`.
4. Set `voting_end = get_block_timestamp() + 86400`.
5. Status → `Voting`. Write back, emit `ProofSubmitted`.

**`cast_vote` logic:**
1. Read dare, assert status == `Voting`.
2. Assert `get_block_timestamp() < dare.voting_end`.
3. Assert caller != dare.poster && caller != dare.claimer.
4. Assert `has_voted[(dare_id, caller)] == false`.
5. Write `has_voted[(dare_id, caller)] = true`.
6. Increment `approve_votes` or `reject_votes`.
7. Write dare back, emit `VoteCast`.

**`finalize_dare` logic:**
1. Read dare.
2. If status == `Voting` && `get_block_timestamp() >= dare.voting_end`:
   - If `approve_votes > reject_votes`: transfer reward to claimer, status → `Approved`.
   - Else: transfer reward back to poster, status → `Rejected`.
3. If status == `Claimed` || status == `Open`, and `get_block_timestamp() > dare.deadline`: transfer reward back to poster, status → `Expired`.
4. Write dare, emit `DareFinalized`.

For ERC20 transfers use OpenZeppelin's `IERC20Dispatcher`:
```cairo
use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
let token = IERC20Dispatcher { contract_address: dare.reward_token };
token.transfer_from(caller, get_contract_address(), dare.reward_amount);
token.transfer(recipient, dare.reward_amount);
```

### 2.5 Build the contract
```bash
cd contracts && scarb build
```

---

## Step 3: Contract Deployment Script

Create `contracts/scripts/deploy.ts`:

```typescript
import { RpcProvider, Account, Contract, json, stark, CallData } from "starknet";
import * as fs from "fs";
import * as path from "path";

const RPC_URL = "https://starknet-sepolia.public.blastapi.io";
const DEPLOYER_PUBLIC_KEY = process.env.DEPLOYER_PUBLIC_KEY!;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!;

async function deploy() {
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, DEPLOYER_PUBLIC_KEY, DEPLOYER_PRIVATE_KEY);

  // Read compiled contract
  const sierraPath = path.join(__dirname, "../target/dev/dare_board_DareBoard.contract_class.json");
  const casmPath = path.join(__dirname, "../target/dev/dare_board_DareBoard.compiled_contract_class.json");
  const sierra = json.parse(fs.readFileSync(sierraPath).toString());
  const casm = json.parse(fs.readFileSync(casmPath).toString());

  // Declare
  console.log("Declaring contract...");
  const declareResponse = await account.declare({ contract: sierra, casm });
  await provider.waitForTransaction(declareResponse.transaction_hash);
  const classHash = declareResponse.class_hash;
  console.log("Class hash:", classHash);

  // Deploy
  console.log("Deploying contract...");
  const constructorCalldata = CallData.compile({ owner: DEPLOYER_PUBLIC_KEY });
  const deployResponse = await account.deployContract({
    classHash,
    constructorCalldata,
    salt: stark.randomAddress(),
  });
  await provider.waitForTransaction(deployResponse.transaction_hash);
  const contractAddress = deployResponse.contract_address;
  console.log("Contract deployed at:", contractAddress);

  // Write to .env.local
  const envPath = path.join(__dirname, "../../.env.local");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  envContent = envContent.replace(/NEXT_PUBLIC_CONTRACT_ADDRESS=.*/g, "");
  envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`;
  envContent += `CONTRACT_CLASS_HASH=${classHash}\n`;
  fs.writeFileSync(envPath, envContent);
  console.log(".env.local updated with contract address.");
}

deploy().catch(console.error);
```

Run: `DEPLOYER_PUBLIC_KEY=... DEPLOYER_PRIVATE_KEY=... npx ts-node contracts/scripts/deploy.ts`

---

## Step 4: Frontend Library Files

### 4.1 `lib/types.ts`

```typescript
export type DareStatus = "Open" | "Claimed" | "Voting" | "Approved" | "Rejected" | "Expired";

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
```

### 4.2 `lib/starkzap.ts`

```typescript
import { StarkSDK } from "starkzap";

export const sdk = new StarkSDK({
  network: (process.env.NEXT_PUBLIC_STARKNET_NETWORK as "sepolia" | "mainnet") ?? "sepolia",
  paymaster: {
    type: "avnu",
    url: "https://paymaster.avnu.fi",
  },
});

export async function connectWallet() {
  return await sdk.connectWallet({
    auth: {
      type: "privy",
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
    },
  });
}
```

### 4.3 `lib/contract.ts`

```typescript
import { RpcProvider, Contract, CallData, uint256, shortString } from "starknet";
import { Dare, DareStatus, CreateDareParams } from "./types";
import DARE_BOARD_ABI from "./abi.json"; // export ABI from scarb build artifacts

const provider = new RpcProvider({
  nodeUrl: process.env.NEXT_PUBLIC_RPC_URL!,
});

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

// Token addresses on Sepolia
export const TOKENS = {
  STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  ETH:  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
};

// ERC20 ABI (minimal: approve, transfer_from, transfer, balance_of)
const ERC20_ABI = [...]; // standard ERC20 ABI

function statusFromFelt(felt: string): DareStatus {
  const map: Record<string, DareStatus> = {
    "0": "Open", "1": "Claimed", "2": "Voting",
    "3": "Approved", "4": "Rejected", "5": "Expired",
  };
  return map[felt] ?? "Open";
}

export async function getDareCount(): Promise<bigint> {
  const contract = new Contract(DARE_BOARD_ABI, CONTRACT_ADDRESS, provider);
  const result = await contract.get_dare_count();
  return BigInt(result.toString());
}

export async function getDare(dareId: bigint): Promise<Dare> {
  const contract = new Contract(DARE_BOARD_ABI, CONTRACT_ADDRESS, provider);
  const raw = await contract.get_dare(dareId);
  return {
    id: BigInt(raw.id.toString()),
    poster: "0x" + BigInt(raw.poster.toString()).toString(16),
    title: shortString.decodeShortString(raw.title),
    description: raw.description,
    rewardToken: "0x" + BigInt(raw.reward_token.toString()).toString(16),
    rewardAmount: uint256.uint256ToBN({ low: raw.reward_amount.low, high: raw.reward_amount.high }),
    deadline: Number(raw.deadline),
    claimer: "0x" + BigInt(raw.claimer.toString()).toString(16),
    proofUrl: raw.proof_url,
    proofDescription: raw.proof_description,
    proofSubmittedAt: Number(raw.proof_submitted_at),
    votingEnd: Number(raw.voting_end),
    approveVotes: Number(raw.approve_votes),
    rejectVotes: Number(raw.reject_votes),
    status: statusFromFelt(raw.status.toString()),
  };
}

export async function getAllDares(): Promise<Dare[]> {
  const count = await getDareCount();
  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1));
  return Promise.all(ids.map(getDare));
}

// Write functions — all accept a `wallet` from Starkzap connectWallet()

export async function createDare(wallet: any, params: CreateDareParams): Promise<string> {
  const amountWei = BigInt(parseFloat(params.rewardAmount) * 1e18);
  const amountU256 = uint256.bnToUint256(amountWei);
  const deadlineTs = Math.floor(params.deadline.getTime() / 1000);

  // Multicall: approve + create_dare
  const approveCall = {
    contractAddress: params.rewardToken,
    entrypoint: "approve",
    calldata: CallData.compile({ spender: CONTRACT_ADDRESS, amount: amountU256 }),
  };

  const createCall = {
    contractAddress: CONTRACT_ADDRESS,
    entrypoint: "create_dare",
    calldata: CallData.compile({
      title: shortString.encodeShortString(params.title.slice(0, 31)),
      description: params.description,
      reward_token: params.rewardToken,
      reward_amount: amountU256,
      deadline: deadlineTs,
    }),
  };

  const tx = await wallet.execute([approveCall, createCall]);
  return tx.transaction_hash;
}

export async function claimDare(wallet: any, dareId: bigint): Promise<string> {
  const tx = await wallet.execute([{
    contractAddress: CONTRACT_ADDRESS,
    entrypoint: "claim_dare",
    calldata: CallData.compile({ dare_id: dareId }),
  }]);
  return tx.transaction_hash;
}

export async function submitProof(
  wallet: any, dareId: bigint, proofUrl: string, description: string
): Promise<string> {
  const tx = await wallet.execute([{
    contractAddress: CONTRACT_ADDRESS,
    entrypoint: "submit_proof",
    calldata: CallData.compile({ dare_id: dareId, proof_url: proofUrl, proof_description: description }),
  }]);
  return tx.transaction_hash;
}

export async function castVote(wallet: any, dareId: bigint, approve: boolean): Promise<string> {
  const tx = await wallet.execute([{
    contractAddress: CONTRACT_ADDRESS,
    entrypoint: "cast_vote",
    calldata: CallData.compile({ dare_id: dareId, approve: approve ? "1" : "0" }),
  }]);
  return tx.transaction_hash;
}

export async function finalizeDare(wallet: any, dareId: bigint): Promise<string> {
  const tx = await wallet.execute([{
    contractAddress: CONTRACT_ADDRESS,
    entrypoint: "finalize_dare",
    calldata: CallData.compile({ dare_id: dareId }),
  }]);
  return tx.transaction_hash;
}
```

---

## Step 5: App Layout

### `app/layout.tsx`

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dare Board ⚡",
  description: "Post dares, lock rewards, let the community decide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
```

---

## Step 6: Pages

### `app/page.tsx` (Feed)

```typescript
"use client";
import { useEffect, useState } from "react";
import { getAllDares } from "@/lib/contract";
import { Dare, DareStatus } from "@/lib/types";
import DareCard from "@/components/DareCard";
import Header from "@/components/Header";
import Link from "next/link";

export default function FeedPage() {
  const [dares, setDares] = useState<Dare[]>([]);
  const [filter, setFilter] = useState<DareStatus | "All">("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const all = await getAllDares();
      setDares(all.reverse()); // newest first
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "All" ? dares : dares.filter(d => d.status === filter);
  const tabs: (DareStatus | "All")[] = ["All", "Open", "Voting", "Approved"];

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {tabs.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${filter === t ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {t}
              </button>
            ))}
          </div>
          <Link href="/create"
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
            + Post a Dare
          </Link>
        </div>
        {loading ? (
          <div className="text-center text-gray-500 py-16">Loading dares...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-16">No dares yet. Be the first to post one!</div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(dare => <DareCard key={dare.id.toString()} dare={dare} />)}
          </div>
        )}
      </main>
    </>
  );
}
```

### `app/create/page.tsx`

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { connectWallet, sdk } from "@/lib/starkzap";
import { createDare, TOKENS } from "@/lib/contract";
import Header from "@/components/Header";

export default function CreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", description: "", rewardToken: TOKENS.STRK,
    rewardAmount: "", deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      const wallet = await connectWallet();
      const hash = await createDare(wallet, {
        ...form,
        deadline: new Date(form.deadline),
      });
      setTxHash(hash);
      setTimeout(() => router.push("/"), 3000);
    } catch (e: any) {
      setError(e.message ?? "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Post a Dare</h1>
        <div className="space-y-4">
          <input placeholder="Dare title (max 50 chars)" maxLength={50}
            value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          <textarea placeholder="Describe the dare in detail..." rows={4} maxLength={500}
            value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
          <div className="flex gap-3">
            <select value={form.rewardToken} onChange={e => setForm({...form, rewardToken: e.target.value})}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
              <option value={TOKENS.STRK}>STRK</option>
              <option value={TOKENS.ETH}>ETH</option>
            </select>
            <input type="number" placeholder="Reward amount" min="0.01" step="0.01"
              value={form.rewardAmount} onChange={e => setForm({...form, rewardAmount: e.target.value})}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          </div>
          <input type="datetime-local" value={form.deadline}
            onChange={e => setForm({...form, deadline: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {txHash && (
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
              ✅ Dare posted! <a href={`https://sepolia.starkscan.co/tx/${txHash}`} target="_blank"
                className="underline">View on Starkscan</a>
            </div>
          )}
          <button onClick={handleSubmit} disabled={loading || !form.title || !form.rewardAmount || !form.deadline}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors">
            {loading ? "Sending transaction..." : "Post Dare & Lock Reward"}
          </button>
        </div>
      </main>
    </>
  );
}
```

### `app/dare/[id]/page.tsx`

```typescript
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getDare } from "@/lib/contract";
import { Dare } from "@/lib/types";
import { connectWallet } from "@/lib/starkzap";
import { claimDare, submitProof, castVote, finalizeDare } from "@/lib/contract";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import VotePanel from "@/components/VotePanel";
import ProofModal from "@/components/ProofModal";

export default function DarePage() {
  const { id } = useParams();
  const [dare, setDare] = useState<Dare | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);

  const load = async () => { setDare(await getDare(BigInt(id as string))); setLoading(false); };
  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, [id]);

  const connect = async () => { const w = await connectWallet(); setWallet(w); return w; };

  const handleClaim = async () => {
    setTxLoading("Claiming dare...");
    const w = wallet ?? await connect();
    await claimDare(w, BigInt(id as string));
    await load();
    setTxLoading("");
  };

  const handleFinalize = async () => {
    setTxLoading("Finalizing...");
    const w = wallet ?? await connect();
    await finalizeDare(w, BigInt(id as string));
    await load();
    setTxLoading("");
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!dare) return <div className="text-center py-20 text-gray-500">Dare not found</div>;

  const now = Math.floor(Date.now() / 1000);
  const canFinalize = dare.status === "Voting" && now >= dare.votingEnd;

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-semibold">{dare.title}</h1>
            <StatusBadge status={dare.status} />
          </div>
          <p className="text-gray-400 mb-6">{dare.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500">Reward</p>
              <p className="font-medium">{(Number(dare.rewardAmount) / 1e18).toFixed(2)} {dare.rewardToken === "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7" ? "ETH" : "STRK"}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500">Deadline</p>
              <p className="font-medium">{new Date(dare.deadline * 1000).toLocaleDateString()}</p>
            </div>
          </div>

          {dare.status === "Open" && (
            <button onClick={handleClaim} disabled={!!txLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium">
              {txLoading || "⚡ Claim This Dare"}
            </button>
          )}

          {dare.status === "Claimed" && wallet?.address?.toLowerCase() === dare.claimer.toLowerCase() && (
            <button onClick={() => setShowProofModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium">
              Submit Proof
            </button>
          )}

          {dare.status === "Voting" && (
            <VotePanel dare={dare} wallet={wallet} onConnect={connect} onVoted={load} />
          )}

          {canFinalize && (
            <button onClick={handleFinalize} disabled={!!txLoading}
              className="w-full mt-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium">
              {txLoading || "Finalize Dare"}
            </button>
          )}
        </div>
      </main>

      {showProofModal && (
        <ProofModal dareId={BigInt(id as string)} wallet={wallet} onConnect={connect}
          onSubmitted={() => { setShowProofModal(false); load(); }}
          onClose={() => setShowProofModal(false)} />
      )}
    </>
  );
}
```

---

## Step 7: Components

### `components/DareCard.tsx`

Card showing title, description (truncated to 120 chars), reward, deadline countdown, status badge, vote bar if voting. Link wraps entire card to `/dare/[id]`.

### `components/StatusBadge.tsx`

Pill with color based on status:
- Open → `bg-green-900 text-green-400`
- Claimed → `bg-blue-900 text-blue-400`
- Voting → `bg-amber-900 text-amber-400`
- Approved → `bg-purple-900 text-purple-400`
- Rejected → `bg-red-900 text-red-400`
- Expired → `bg-gray-800 text-gray-500`

### `components/VotePanel.tsx`

Shows proof URL as a clickable link, proof description, vote counts as a bar (`approve / total`), Approve and Reject buttons that call `castVote()`. Disable buttons if wallet address is poster or claimer. Show "Already voted" if voted.

### `components/ProofModal.tsx`

Overlay modal with:
- Input for proof URL (YouTube/Twitter/Imgur)
- Textarea for "What did you do?" description
- Submit button calling `submitProof()`
- Loading state + tx hash display

### `components/Header.tsx`

```typescript
"use client";
import Link from "next/link";
import { useState } from "react";
import { connectWallet } from "@/lib/starkzap";

export default function Header() {
  const [address, setAddress] = useState<string>("");
  const connect = async () => {
    const w = await connectWallet();
    setAddress(w.address);
  };
  const short = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">Dare Board ⚡</Link>
        <div className="flex items-center gap-3">
          {address ? (
            <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg">{short(address)}</span>
          ) : (
            <button onClick={connect}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
              Connect
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
```

---

## Step 8: API Routes

### `app/api/dares/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getAllDares } from "@/lib/contract";

export const revalidate = 10;

export async function GET() {
  const dares = await getAllDares();
  return NextResponse.json(dares, {
    headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate" },
  });
}
```

### `app/api/finalize/route.ts`

```typescript
import { NextResponse } from "next/server";
import { Account, RpcProvider } from "starknet";
import { getAllDares, finalizeDare } from "@/lib/contract";

export async function POST() {
  const provider = new RpcProvider({ nodeUrl: process.env.NEXT_PUBLIC_RPC_URL! });
  const account = new Account(
    provider,
    process.env.DEPLOYER_PUBLIC_KEY!,
    process.env.DEPLOYER_PRIVATE_KEY!,
  );

  const now = Math.floor(Date.now() / 1000);
  const dares = await getAllDares();
  const toFinalize = dares.filter(d =>
    (d.status === "Voting" && now >= d.votingEnd) ||
    (d.status === "Claimed" && now > d.deadline) ||
    (d.status === "Open" && now > d.deadline)
  );

  for (const dare of toFinalize) {
    await finalizeDare(account, dare.id);
  }

  return NextResponse.json({ finalized: toFinalize.length });
}
```

---

## Step 9: Vercel Cron

Create `vercel.json` at project root:

```json
{
  "crons": [
    {
      "path": "/api/finalize",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## Step 10: Deploy to Vercel

```bash
npm install -g vercel
vercel

# Set env vars in Vercel dashboard:
# NEXT_PUBLIC_CONTRACT_ADDRESS, DEPLOYER_PRIVATE_KEY, DEPLOYER_PUBLIC_KEY,
# NEXT_PUBLIC_PRIVY_APP_ID, NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_STARKNET_NETWORK
```

---

## Critical Rules for the Agent

1. **TypeScript everywhere** — no `.js` files. Add `"strict": true` to `tsconfig.json`.
2. **Never use `window.ethereum`** — this is Starknet, not EVM. Use Starkzap SDK and starknet.js only.
3. **All write transactions go through `wallet.execute()`** from Starkzap — not raw `account.execute()` from starknet.js. This ensures gasless flow works.
4. **ERC20 approve must be bundled** with `create_dare` as a multicall in a single `wallet.execute([approveCall, createCall])` — never two separate transactions.
5. **DEPLOYER_PRIVATE_KEY never goes to the browser** — only used in `contracts/scripts/deploy.ts` and `app/api/finalize/route.ts`.
6. **ABI extraction** — after `scarb build`, copy the ABI array from `contracts/target/dev/dare_board_DareBoard.contract_class.json` into `lib/abi.json` and import it in `lib/contract.ts`.
7. **Cairo ByteArray vs felt252** — `title` can be `felt252` (max 31 chars ASCII), `description` must be `ByteArray` for longer strings. Make sure the calldata encoding matches: use `shortString.encodeShortString()` for felt252, and pass raw string for ByteArray.
8. **Amount formatting** — always divide `rewardAmount` (u256 from contract) by `1e18` for display. Use `(Number(dare.rewardAmount) / 1e18).toFixed(2)` in UI.
9. **Starknet address comparison** — addresses from the contract come as BigInt hex strings. Normalize both sides before comparing: `BigInt(addr1) === BigInt(addr2)`.
10. **Block timestamp** — Starknet `block_timestamp` is a Unix timestamp in seconds, same as `Math.floor(Date.now() / 1000)` in JS.

---

## Checklist Before Demo

- [ ] Cairo contract compiles with `scarb build`
- [ ] Contract deployed to Sepolia, address in `.env.local`
- [ ] Feed page loads dares from contract
- [ ] Create page: dare posts successfully, reward locked in contract
- [ ] Claim page: claimer can claim an open dare
- [ ] Proof submission: proof URL + description submitted on-chain
- [ ] Vote panel: approve/reject votes work, progress bar updates
- [ ] Finalize: reward goes to correct party
- [ ] Starkzap passkey login works (no MetaMask required)
- [ ] Gasless txs work via AVNU (no gas fee for users)
- [ ] Deployed to Vercel with all env vars set