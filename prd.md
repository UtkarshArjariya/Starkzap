# Dare Board Product Requirements

## 1. Product Overview

Dare Board is a public challenge marketplace on Starknet Sepolia.

- A poster creates a dare and escrows a token reward.
- A claimer accepts the dare and submits proof.
- The community votes on whether the proof is valid.
- Once the review window closes, the contract finalizes payout to the claimer or returns funds to the poster.

The current implementation uses a single product workspace at `dare-board/`, containing a Next.js frontend plus a Cairo contract. The contract is the source of truth for rewards, claim state, voting state, and finalization logic.

## 2. Current Technical Architecture

### Frontend

- Framework: Next.js 16 App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Runtime location: `dare-board/frontend/`

#### Frontend File Structure

```text
dare-board/
  frontend/
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
```

### Blockchain

- Network: Starknet Sepolia
- Contract language: Cairo 2.x
- Contract source: `dare-board/contracts/src/dare_board.cairo`
- ABI consumed by frontend: `dare-board/frontend/src/lib/abi.json`

#### Contract File Structure

```text
dare-board/
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
```

### Wallet Layer

- Browser wallets: Braavos and Argent X through `@starknet-io/get-starknet-core`
- Optional testnet fallback: direct private-key connect inside the wallet modal
- All writes go through the frontend wallet abstraction and end in `wallet.execute(...)`

### Server Capabilities

The Next app also owns lightweight route handlers:

- `GET /api/dares`
- `GET /api/dare/[id]`
- `POST /api/finalize`

The old Express backend is no longer required for the live app flow.

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

### 4.1 Required Entrypoints

- `create_dare`
- `claim_dare`
- `submit_proof`
- `cast_vote`
- `finalize_dare`
- `get_dare`
- `get_dare_count`
- `has_voter_voted`

### 4.2 Contract Rules

- Title is encoded as `felt252`, so the frontend must restrict it to 31 ASCII characters.
- Description and proof fields use `ByteArray`.
- Reward amount is escrowed at creation time.
- Poster cannot claim their own dare.
- Poster and claimer cannot vote.
- Finalization logic must stay fully on-chain.

## 5. Frontend Requirements

### 5.1 Routes

- `dare-board/frontend/src/app/page.tsx` — public feed
- `dare-board/frontend/src/app/create/page.tsx` — create flow
- `dare-board/frontend/src/app/dare/[id]/page.tsx` — claim, proof, voting, finalize
- `dare-board/frontend/src/app/profile/page.tsx` — posted/claimed view

### 5.2 Shared Components

- `dare-board/frontend/src/components/Header.tsx`
- `dare-board/frontend/src/components/DareCard.tsx`
- `dare-board/frontend/src/components/StatusBadge.tsx`
- `dare-board/frontend/src/components/VotePanel.tsx`
- `dare-board/frontend/src/components/ProofModal.tsx`
- `dare-board/frontend/src/components/CountdownTimer.tsx`

### 5.3 UX Rules

- Feed refreshes every 15 seconds.
- Detail page refreshes every 10 seconds.
- Create flow shows transaction success feedback and Starkscan link.
- Voting flow shows proof link, tally, and wallet restrictions.
- Profile page requires a connected wallet.
- Demo mode is allowed when no contract address exists, but write actions remain unavailable.

## 6. API Route Requirements

### `GET /api/dares`

- Returns serialized dare objects.
- Uses short cache revalidation.

### `GET /api/dare/[id]`

- Returns a single serialized dare object.
- Returns `404` JSON when the id is invalid or missing on-chain.

### `POST /api/finalize`

- Server-only route for cron-based finalization.
- Must require `CRON_SECRET` when that env var is present.
- Must use `DEPLOYER_ACCOUNT_ADDRESS` and `DEPLOYER_PRIVATE_KEY` only on the server.

## 7. Environment Variables

### Client-safe

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_RPC_URL=https://starknet-sepolia-rpc.publicnode.com
NEXT_PUBLIC_STARKSCAN_URL=https://sepolia.starkscan.co
```

### Server-only

```env
DEPLOYER_ACCOUNT_ADDRESS=
DEPLOYER_PRIVATE_KEY=
CRON_SECRET=
```

## 8. Deployment Requirements

### Contract

- Build with `cd dare-board/contracts && scarb build`
- Deploy with `dare-board/contracts/scripts/deploy.ts`
- Deployment script must write the ABI to `dare-board/frontend/src/lib/abi.json`
- Deployment script must write the deployed contract address to `dare-board/frontend/.env.local`

### Frontend

- Deploy the Next.js app from `dare-board/frontend/`
- Set runtime vars in the hosting platform
- Optional cron support can use `dare-board/frontend/vercel.json`

## 9. Security Requirements

- Never hardcode deployer private keys in code or documentation.
- Never expose server-only env vars to the browser.
- All reward settlement rules must remain enforced by the contract.
- The finalize route must not run without auth if a cron secret is configured.

## 10. Current Scope

### Must Have

- Public feed
- Create dare flow
- Dare detail flow
- Proof submission
- Community voting
- Manual finalize
- Contract deployment script

### Nice to Have

- Hosted cron auto-finalization
- Rich proof embeds
- Search and filtering beyond status tabs

### Out of Scope

- Mainnet deployment
- Native media upload
- Multi-claimer support
- Off-chain moderation layer
