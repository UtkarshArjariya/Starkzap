# Dare Board — MVP Product Requirements Document

> **Stack:** Next.js 14 (App Router) + TypeScript only. Cairo smart contract on Starknet Sepolia. Starkzap SDK for wallet/gasless UX.

---

## 1. Product Overview

**Dare Board** is a decentralized dare-and-reward platform. Anyone can post a dare publicly and lock a token reward in a smart contract escrow. Anyone can attempt the dare, submit proof (photo/video link), and the community votes on whether the proof is valid. If the majority approves, the smart contract releases the reward to the claimer automatically.

No wallets. No seed phrases. Passkey / social login via Starkzap SDK. Gasless transactions via AVNU Paymaster.

---

## 2. Wallet Configuration

**Deployer / Admin Wallet (Braavos):**
- Public Key: `0x031e44081b9c32225b810e1575f70cb39d08ed9e66061c1cbef1e553b84d8886`
- Private Key: `0x00e6d4c153062a9191cedcb0521ecc7772481a95b99c21da5fe1c1133f825ff2`
- Network: Starknet Sepolia Testnet
- Use this wallet ONLY for contract deployment. Store in `.env.local` as `DEPLOYER_PUBLIC_KEY` and `DEPLOYER_PRIVATE_KEY`. Never commit `.env.local` to git.

---

## 3. Core User Flows

### 3.1 Post a Dare
1. User logs in via Starkzap (Google/Apple passkey — no wallet needed).
2. User fills: Dare title, description, deadline (date picker), reward amount (STRK or ETH).
3. User clicks "Post Dare" — Starkzap sends a gasless transaction calling `create_dare()` on the contract, locking the reward in escrow.
4. Dare appears on the public feed instantly.

### 3.2 Claim a Dare
1. Any logged-in user views a dare on the feed.
2. They click "I'll Do This" — marks them as the claimer on-chain (one claimer per dare at a time OR open multi-claim, MVP = one claimer).
3. They complete the dare IRL, then submit proof: a URL (YouTube, Twitter, Imgur, etc.) plus a short description.
4. Proof submission calls `submit_proof()` on the contract.

### 3.3 Community Vote
1. Once proof is submitted, a 24-hour voting window opens.
2. Any logged-in user (except the dare poster and claimer) can vote `APPROVE` or `REJECT`.
3. Each vote is a gasless on-chain transaction calling `cast_vote()`.
4. After the voting window closes, anyone can call `finalize_dare()`.
5. If `APPROVE` votes > `REJECT` votes → reward auto-transfers to claimer.
6. If `REJECT` wins or no proof submitted before deadline → reward returns to poster.

---

## 4. Smart Contract — Cairo (Starknet)

### 4.1 File Structure
```
contracts/
  src/
    dare_board.cairo      ← main contract
    lib.cairo
  Scarb.toml
  scripts/
    deploy.ts             ← deployment script using starknet.js
```

### 4.2 Data Structures

```cairo
#[derive(Drop, Serde, starknet::Store)]
struct Dare {
    id: u64,
    poster: ContractAddress,
    title: felt252,
    description: ByteArray,
    reward_token: ContractAddress,   // ERC20 token address (STRK or ETH)
    reward_amount: u256,
    deadline: u64,                   // Unix timestamp
    claimer: ContractAddress,
    proof_url: ByteArray,
    proof_description: ByteArray,
    proof_submitted_at: u64,
    voting_end: u64,                 // proof_submitted_at + 86400 (24h)
    approve_votes: u64,
    reject_votes: u64,
    status: DareStatus,
}

#[derive(Drop, Serde, starknet::Store, PartialEq)]
enum DareStatus {
    Open,           // awaiting claimer
    Claimed,        // claimer set, awaiting proof
    Voting,         // proof submitted, voting open
    Approved,       // reward sent to claimer
    Rejected,       // reward returned to poster
    Expired,        // deadline passed without valid claim
}
```

### 4.3 Storage

```cairo
#[storage]
struct Storage {
    dares: LegacyMap<u64, Dare>,
    dare_count: u64,
    has_voted: LegacyMap<(u64, ContractAddress), bool>,  // dare_id + voter => voted?
    owner: ContractAddress,
}
```

### 4.4 Interface / Entrypoints

```cairo
#[starknet::interface]
trait IDareBoard<TContractState> {
    // Write
    fn create_dare(
        ref self: TContractState,
        title: felt252,
        description: ByteArray,
        reward_token: ContractAddress,
        reward_amount: u256,
        deadline: u64,
    ) -> u64;

    fn claim_dare(ref self: TContractState, dare_id: u64);

    fn submit_proof(
        ref self: TContractState,
        dare_id: u64,
        proof_url: ByteArray,
        proof_description: ByteArray,
    );

    fn cast_vote(ref self: TContractState, dare_id: u64, approve: bool);

    fn finalize_dare(ref self: TContractState, dare_id: u64);

    // Read
    fn get_dare(self: @TContractState, dare_id: u64) -> Dare;
    fn get_dare_count(self: @TContractState) -> u64;
    fn has_voter_voted(self: @TContractState, dare_id: u64, voter: ContractAddress) -> bool;
}
```

### 4.5 Contract Logic Rules

**`create_dare`:**
- Caller must approve `reward_amount` of `reward_token` to this contract first (ERC20 `approve`).
- Contract calls `transfer_from(caller, contract_address, reward_amount)` to lock funds.
- Deadline must be > `block_timestamp + 3600` (at least 1 hour in the future).
- Emits `DareCreated(dare_id, poster, reward_amount)` event.

**`claim_dare`:**
- Status must be `Open`.
- Caller cannot be the poster.
- Deadline must not have passed.
- Sets `claimer = caller`, status → `Claimed`.
- Emits `DareClaimed(dare_id, claimer)`.

**`submit_proof`:**
- Caller must be the `claimer`.
- Status must be `Claimed`.
- Sets `proof_url`, `proof_description`, `proof_submitted_at = block_timestamp`.
- Sets `voting_end = block_timestamp + 86400`.
- Status → `Voting`.
- Emits `ProofSubmitted(dare_id, claimer, proof_url)`.

**`cast_vote`:**
- Status must be `Voting`.
- `block_timestamp < voting_end`.
- Caller cannot be poster or claimer.
- `has_voted[dare_id, caller]` must be false.
- Sets `has_voted[dare_id, caller] = true`.
- Increments `approve_votes` or `reject_votes`.
- Emits `VoteCast(dare_id, voter, approve)`.

**`finalize_dare`:**
- Anyone can call this.
- If status is `Voting` and `block_timestamp >= voting_end`:
  - `approve_votes > reject_votes` → transfer reward to claimer, status → `Approved`.
  - else → transfer reward back to poster, status → `Rejected`.
- If status is `Claimed` and `block_timestamp > deadline`:
  - Transfer reward back to poster, status → `Expired`.
- If status is `Open` and `block_timestamp > deadline`:
  - Transfer reward back to poster, status → `Expired`.
- Emits `DareFinalized(dare_id, status, winner)`.

### 4.6 Events

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
```

### 4.7 Deployment Script (`contracts/scripts/deploy.ts`)

```typescript
// Use starknet.js with the provided Braavos wallet keys
// 1. Load private key from process.env.DEPLOYER_PRIVATE_KEY
// 2. Connect to Starknet Sepolia RPC (https://starknet-sepolia.public.blastapi.io)
// 3. Declare the contract class
// 4. Deploy with constructor args: owner = DEPLOYER_PUBLIC_KEY
// 5. Write deployed contract address to .env.local as NEXT_PUBLIC_CONTRACT_ADDRESS
// 6. Write class hash to .env.local as CONTRACT_CLASS_HASH
```

Run with: `npx ts-node contracts/scripts/deploy.ts`

---

## 5. Frontend — Next.js 14 App Router (TypeScript only)

### 5.1 Project Structure

```
src/
  app/
    layout.tsx                    ← StarkzapProvider wrapper
    page.tsx                      ← Feed (all open dares)
    dare/
      [id]/
        page.tsx                  ← Dare detail + proof submission + voting
    create/
      page.tsx                    ← Post a new dare
    profile/
      page.tsx                    ← My dares + my claims
  components/
    DareCard.tsx
    DareForm.tsx
    ProofModal.tsx
    VotePanel.tsx
    StatusBadge.tsx
    Header.tsx
  lib/
    contract.ts                   ← Contract ABI + call helpers
    starkzap.ts                   ← Starkzap SDK initialization
    types.ts                      ← TypeScript types mirroring Cairo structs
  hooks/
    useDares.ts                   ← Read all dares from contract
    useDare.ts                    ← Read single dare
    useContract.ts                ← Write transactions
```

### 5.2 Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed contract address>
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
NEXT_PUBLIC_RPC_URL=https://starknet-sepolia.public.blastapi.io
DEPLOYER_PUBLIC_KEY=0x031e44081b9c32225b810e1575f70cb39d08ed9e66061c1cbef1e553b84d8886
DEPLOYER_PRIVATE_KEY=0x00e6d4c153062a9191cedcb0521ecc7772481a95b99c21da5fe1c1133f825ff2
PRIVY_APP_ID=<your privy app id>
```

### 5.3 Starkzap Initialization (`lib/starkzap.ts`)

```typescript
import { StarkSDK } from "starkzap";

export const sdk = new StarkSDK({
  network: "sepolia",
  paymaster: {
    type: "avnu",
    url: "https://paymaster.avnu.fi",   // gasless via AVNU
  },
});

// Connect wallet using Privy social login
export async function connectWallet() {
  return await sdk.connectWallet({
    auth: { type: "privy", appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID! },
  });
}
```

### 5.4 Contract Helpers (`lib/contract.ts`)

Export typed functions for every contract call:

```typescript
export async function createDare(wallet, params: CreateDareParams): Promise<string>
export async function claimDare(wallet, dareId: bigint): Promise<string>
export async function submitProof(wallet, dareId: bigint, proofUrl: string, description: string): Promise<string>
export async function castVote(wallet, dareId: bigint, approve: boolean): Promise<string>
export async function finalizeDare(wallet, dareId: bigint): Promise<string>
export async function getDare(provider, dareId: bigint): Promise<Dare>
export async function getDareCount(provider): Promise<bigint>
```

All write functions must use `wallet.execute()` from Starkzap — NOT raw starknet.js account calls. This ensures gasless + passkey flow works.

Before `createDare`, call ERC20 `approve(contractAddress, amount)` as a multicall bundled with `create_dare` in a single `wallet.execute([approveCall, createDareCall])`.

### 5.5 TypeScript Types (`lib/types.ts`)

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
  rewardAmount: string;   // human-readable e.g. "10"
  deadline: Date;
}
```

---

## 6. Pages & Components

### 6.1 Feed Page (`app/page.tsx`)
- Fetch all dares using `getDareCount` + `getDare` in parallel (`Promise.all`).
- Filter tabs: All / Open / Voting / Completed.
- Render `<DareCard />` for each.
- "Post a Dare" CTA button → `/create`.
- Poll every 15 seconds for new dares (no WebSocket needed for MVP).

### 6.2 DareCard Component
Shows: title, poster address (shortened), reward amount + token, deadline countdown, status badge, vote counts if in Voting status.
CTA button changes based on status:
- Open → "Claim This Dare"
- Voting → "Vote Now"
- Approved/Rejected → "View Result"

### 6.3 Create Page (`app/create/page.tsx`)
Form fields:
- Title (text, max 50 chars)
- Description (textarea, max 500 chars)
- Reward Token (dropdown: STRK / ETH — use Starkzap's `sepoliaTokens`)
- Reward Amount (number input)
- Deadline (date-time picker, min: now + 1 hour)

On submit:
1. Check wallet connected, prompt login if not.
2. Call `createDare()` helper.
3. Show tx hash + "View on Starkscan" link.
4. Redirect to `/dare/[id]` after 2 seconds.

### 6.4 Dare Detail Page (`app/dare/[id]/page.tsx`)
- Show full dare details.
- If status = `Open` and user ≠ poster → show "Claim This Dare" button.
- If status = `Claimed` and user = claimer → show proof submission form (`<ProofModal />`).
- If status = `Voting` → show `<VotePanel />`.
- If status = `Voting` and `block_timestamp >= votingEnd` → show "Finalize Dare" button.
- Show countdown timers for deadline and voting window.

### 6.5 VotePanel Component
- Shows proof URL (embed preview if YouTube/Twitter), proof description.
- Shows live vote counts: `[Approve: X] [Reject: Y]` with a progress bar.
- Approve / Reject buttons (disabled if user already voted, is poster, or is claimer).
- Each vote is a gasless tx via Starkzap.

### 6.6 StatusBadge Component
Color-coded pill:
- Open → green
- Claimed → blue
- Voting → amber
- Approved → purple
- Rejected → red
- Expired → gray

### 6.7 Header Component
- Logo: "Dare Board ⚡"
- Login/logout via Starkzap
- Shows shortened wallet address when logged in
- Link to `/profile`

### 6.8 Profile Page (`app/profile/page.tsx`)
Two tabs:
- "My Dares" — dares user has posted
- "My Claims" — dares user has claimed / voted on

---

## 7. UI Design Guidelines

- Use **Tailwind CSS** only (no component libraries for MVP).
- Dark/light mode support via Tailwind `dark:` classes.
- Mobile-first responsive design.
- Color palette:
  - Primary: `#7F77DD` (purple — matches Starknet branding)
  - Background: `#0F0F0F` dark / `#FAFAFA` light
  - Cards: glass-morphism style with `backdrop-blur` border
- Font: Inter (via `next/font`)
- Show transaction loading states: spinner + "Sending transaction..." text.
- Show Starkscan links for every tx hash: `https://sepolia.starkscan.co/tx/{hash}`

---

## 8. Backend / API Routes

For MVP, keep backend minimal — contract is the source of truth.

### 8.1 API Routes (Next.js Route Handlers)

```
app/api/
  dares/
    route.ts          ← GET: fetch all dares from contract (server-side RPC call, cached 10s)
  dare/
    [id]/
      route.ts        ← GET: fetch single dare from contract
  finalize/
    route.ts          ← POST: trigger finalize_dare using deployer wallet (cron-style)
```

### 8.2 Auto-Finalize Cron (`app/api/finalize/route.ts`)
- Called by a Vercel Cron Job every 5 minutes.
- Fetches all dares with status `Voting` or `Claimed`.
- For each, checks if `block_timestamp > votingEnd` or `block_timestamp > deadline`.
- If yes, calls `finalizeDare()` using the deployer wallet keys from env.
- This ensures rewards are auto-distributed without user action.

```
vercel.json:
{
  "crons": [{ "path": "/api/finalize", "schedule": "*/5 * * * *" }]
}
```

---

## 9. Token Support (MVP)

Support only two tokens on Sepolia:
- **STRK**: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
- **ETH**: `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7`

Display human-readable amounts using Starkzap's `Amount` class.

---

## 10. Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "starkzap": "latest",
    "starknet": "^9.0.0",
    "@cartridge/controller": "latest",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## 11. Deployment

1. **Contract:** Deploy to Starknet Sepolia using `contracts/scripts/deploy.ts`.
2. **Frontend:** Deploy to Vercel. Set all env vars in Vercel dashboard.
3. **Cron:** Enable Vercel Cron Jobs (requires Pro plan or use a free cron service like cron-job.org hitting `/api/finalize`).

---

## 12. MVP Scope (What to Build in 3 Hours)

### Must Have ✅
- Smart contract: `create_dare`, `claim_dare`, `submit_proof`, `cast_vote`, `finalize_dare`
- Contract deployment script
- Feed page with dare cards
- Create dare page
- Dare detail page with proof submission
- Voting UI
- Starkzap wallet login (passkey / social)
- Gasless transactions via AVNU

### Nice to Have ⭐
- Auto-finalize cron
- Profile page
- Starkscan tx links
- Countdown timers
- Token dropdown (STRK + ETH)

### Out of Scope ❌
- Multi-claimer support
- Dispute resolution mechanism
- Notifications
- Image upload (use URLs only for MVP)
- Mainnet deployment

---

## 13. Commands

```bash
# Install
npm install

# Dev
npm run dev

# Build Cairo contract
cd contracts && scarb build

# Deploy contract
npx ts-node contracts/scripts/deploy.ts

# Type check
npx tsc --noEmit

# Deploy to Vercel
vercel --prod
```

---

## 14. Security Notes

- Never expose `DEPLOYER_PRIVATE_KEY` to the client. It is server-only (API routes + deploy script).
- All `NEXT_PUBLIC_*` vars are safe for client exposure.
- Contract enforces all business logic on-chain — frontend is display only.
- Voters cannot be the poster or claimer (enforced in Cairo contract).
- Re-entrancy not a concern in Cairo/Starknet (no call-value attacks), but still emit events before state-mutating transfers as best practice.