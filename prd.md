# Dare Board Product Requirements

## 1. Product Overview

Dare Board is a public challenge marketplace on Starknet Sepolia.

- A poster creates a dare and escrows a token reward.
- A claimer accepts the dare and submits proof.
- The community votes on whether the proof is valid.
- Once the review window closes, the contract finalizes payout to the claimer or returns funds to the poster.

The preferred repo shape is a single application directory at `dare-board/`, with the Next.js product app at the root and the Cairo contract kept in a dedicated `contracts/` subdirectory.

## 2. Current Technical Architecture

### Application Structure

- Main app root: `dare-board/`
- Frontend framework: Next.js 16 App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Smart contracts: `dare-board/contracts/`
- Legacy backend reference: `dare-board/legacy/backend/`

### Why This Shape Is Preferred

- Next.js projects work best when app code, config, env, and scripts live in one root directory.
- Starknet Cairo code should remain separate from the web app source because it has different tooling, build outputs, and deployment flows.
- Legacy backend code should not sit beside active app runtime paths if it no longer powers the product.

### File Structure

```text
dare-board/
  src/
    app/
      api/
        dare/[id]/route.ts
        dares/route.ts
        finalize/route.ts
      create/page.tsx
      dare/[id]/page.tsx
      profile/page.tsx
      globals.css
      layout.tsx
      page.tsx
      providers.tsx
    components/
      CountdownTimer.tsx
      DareCard.tsx
      Header.tsx
      LoadingSpinner.tsx
      ProofModal.tsx
      StatusBadge.tsx
      VotePanel.tsx
      WalletModal.tsx
    context/
      WalletContext.tsx
    lib/
      abi.json
      config.ts
      contract.ts
      demoData.ts
      serialize.ts
      starkzap.ts
      types.ts
      utils.ts
  contracts/
    src/
      dare_board.cairo
      lib.cairo
    scripts/
      deploy.ts
      package.json
      tsconfig.json
    Scarb.toml
    snfoundry.toml
  legacy/
    backend/
  deploy.sh
  next.config.mjs
  package.json
  postcss.config.js
  tailwind.config.js
  tsconfig.json
  tsconfig.typecheck.json
  vercel.json
```

## 3. Core User Flows

### 3.1 Post a Dare

1. User opens `/create`.
2. User enters title, description, reward token, reward amount, and deadline.
3. Frontend validates title length and deadline.
4. Wallet sends a multicall:
   - ERC20 `approve`
   - contract `create_dare`
5. The dare appears in the public feed.

### 3.2 Claim a Dare

1. User opens `/dare/[id]`.
2. If the dare is `Open`, not expired, and the user is not the poster, they can claim it.
3. Wallet calls `claim_dare`.

### 3.3 Submit Proof

1. Claimer opens the dare detail page.
2. Claimer submits a proof URL and optional description.
3. Wallet calls `submit_proof`.
4. Dare enters `Voting` state and exposes the review panel.

### 3.4 Vote on Proof

1. Community members view the proof on the dare detail page.
2. Poster and claimer are blocked from voting.
3. Eligible voters call `cast_vote(approve: boolean)`.

### 3.5 Finalize the Dare

1. Once voting ends, anyone can call `finalize_dare` from the detail page.
2. Optionally, `POST /api/finalize` can be triggered by a cron job.
3. Finalization sends funds to the claimer if approvals beat rejections; otherwise funds return to the poster.
4. Open or claimed dares that miss the deadline expire and refund the poster.

## 4. Contract Requirements

- Contract location: `dare-board/contracts/`
- Contract source: `dare-board/contracts/src/dare_board.cairo`
- ABI consumed by app: `dare-board/src/lib/abi.json`

Required entrypoints:
- `create_dare`
- `claim_dare`
- `submit_proof`
- `cast_vote`
- `finalize_dare`
- `get_dare`
- `get_dare_count`
- `has_voter_voted`

Rules:
- Title is encoded as `felt252`, so the UI must restrict it to 31 ASCII characters.
- Description and proof fields use `ByteArray`.
- Reward amount is escrowed at creation time.
- Poster cannot claim their own dare.
- Poster and claimer cannot vote.
- Finalization logic must stay fully on-chain.

## 5. Frontend Requirements

Routes:
- `dare-board/src/app/page.tsx`
- `dare-board/src/app/create/page.tsx`
- `dare-board/src/app/dare/[id]/page.tsx`
- `dare-board/src/app/profile/page.tsx`

Shared components:
- `dare-board/src/components/Header.tsx`
- `dare-board/src/components/DareCard.tsx`
- `dare-board/src/components/StatusBadge.tsx`
- `dare-board/src/components/VotePanel.tsx`
- `dare-board/src/components/ProofModal.tsx`
- `dare-board/src/components/CountdownTimer.tsx`

UX rules:
- Feed refreshes every 15 seconds.
- Detail page refreshes every 10 seconds.
- Create flow shows transaction success feedback and Starkscan link.
- Voting flow shows proof link, tally, and wallet restrictions.
- Profile page requires a connected wallet.
- Demo mode is allowed when no contract address exists, but write actions remain unavailable.

## 6. Environment Variables

Use `dare-board/.env.local`.

Client-safe:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_RPC_URL=https://starknet-sepolia-rpc.publicnode.com
NEXT_PUBLIC_STARKSCAN_URL=https://sepolia.starkscan.co
```

Server-only:
```env
DEPLOYER_ACCOUNT_ADDRESS=
DEPLOYER_PRIVATE_KEY=
CRON_SECRET=
```

## 7. Deployment Requirements

- Build contract with `cd dare-board/contracts && scarb build`
- Deploy with `dare-board/contracts/scripts/deploy.ts`
- Deployment script must write ABI to `dare-board/src/lib/abi.json`
- Deployment script must write the deployed contract address to `dare-board/.env.local`
- Deploy the Next.js app from `dare-board/`

## 8. Structure Decision

- Keep the Next.js app as one single directory: `dare-board/`
- Keep smart contracts separate inside that app directory: `dare-board/contracts/`
- Keep old backend only under `dare-board/legacy/backend/` until deleted
