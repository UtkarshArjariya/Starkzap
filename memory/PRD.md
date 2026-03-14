# Dare Board — PRD Memory

## Problem Statement
Build "Dare Board" — a decentralized dare-and-reward dApp on Starknet Sepolia. Users post dares with token rewards locked in escrow. Others claim dares, submit proof (URL), and the community votes to release or refund the reward. Gasless via Starkzap + AVNU. No seed phrases — passkey/social login.

## Architecture

### Tech Stack
- **Frontend**: React SPA (CRA, port 3000), Tailwind CSS, React Router v7
- **Blockchain**: Starknet Sepolia Testnet
- **Contract Language**: Cairo 2024_07 (Scarb)
- **Wallet SDK**: @starknet-io/get-starknet (current) → Starkzap SDK (when Privy App ID is ready)
- **Chain Library**: starknet.js v6.24.1

### Deployer Wallet (Braavos, Starknet Sepolia)
- Public Key: `0x05621F5e671ccb298FD6B226A8e0Bfba97DAF4BAa6196C2F12cEEe03A15765a9`
- Private Key: `0x00dcd338a391374e143d3da83397431ae5ab6949fb055ca98735debde67fe742`
- **Never expose to browser — server-side only**

### Token Addresses (Sepolia)
- STRK: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
- ETH:  `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7`

## File Structure

```
/app/
├── contracts/
│   ├── Scarb.toml                      — Cairo package config (starknet >=2.8.0)
│   ├── src/
│   │   ├── lib.cairo                   — pub mod dare_board
│   │   └── dare_board.cairo            — Full DareBoard contract
│   └── scripts/
│       ├── deploy.ts                   — Deployment script (starknet.js)
│       └── tsconfig.json
├── frontend/src/
│   ├── App.js                          — Router: /, /create, /dare/:id, /profile
│   ├── context/
│   │   └── WalletContext.jsx           — Global wallet state
│   ├── lib/
│   │   ├── abi.json                    — Contract ABI (REPLACE with actual after scarb build)
│   │   ├── contract.js                 — All read/write helpers
│   │   ├── starkzap.js                 — Wallet connection wrapper
│   │   └── config.js                   — Tokens, RPC URL, utilities
│   ├── components/
│   │   ├── Header.jsx, DareCard.jsx, StatusBadge.jsx
│   │   ├── VotePanel.jsx, ProofModal.jsx
│   │   ├── CountdownTimer.jsx, LoadingSpinner.jsx
│   └── pages/
│       ├── FeedPage.jsx                — / (dare grid + filter tabs)
│       ├── CreatePage.jsx              — /create (dare form)
│       ├── DarePage.jsx                — /dare/:id (detail + actions)
│       └── ProfilePage.jsx             — /profile (my dares + claims)
└── .env.example
```

## What's Been Implemented (2025-02-xx)

### Cairo Smart Contract ✅
- Full DareBoard contract with all 5 entrypoints: `create_dare`, `claim_dare`, `submit_proof`, `cast_vote`, `finalize_dare`
- Read functions: `get_dare`, `get_dare_count`, `has_voter_voted`
- ERC20 escrow: `transfer_from` on create, `transfer` on finalize
- DareStatus enum: Open → Claimed → Voting → Approved/Rejected/Expired
- Events: DareCreated, DareClaimed, ProofSubmitted, VoteCast, DareFinalized
- ByteArray storage for description/proof fields (requires Cairo 2.8+)
- No OpenZeppelin dependency — minimal inline IERC20 interface

### Deploy Script ✅
- `contracts/scripts/deploy.ts` — declare + deploy + auto-write ABI to `frontend/src/lib/abi.json` + update `frontend/.env`

### Frontend React SPA ✅
- Dark theme (#0F0F0F) with #7F77DD purple accent
- Glass-morphism cards, countdown timers, status badges
- Wallet connection (get-starknet, to be swapped for Starkzap/Privy)
- All pages functional, zero lint errors, build passes

## Environment Variables (frontend/.env)
```env
REACT_APP_CONTRACT_ADDRESS=       # Set after contract deployment
REACT_APP_STARKNET_NETWORK=sepolia
REACT_APP_RPC_URL=https://starknet-sepolia.public.blastapi.io
REACT_APP_PRIVY_APP_ID=placeholder-privy-app-id
```

## Deployment Steps (Cairo Contract)
```bash
# 1. Build contract
cd /app/contracts
scarb build

# 2. Install deploy script deps
cd /app/contracts/scripts
npm init -y && npm install starknet ts-node typescript

# 3. Deploy
npx ts-node --project tsconfig.json deploy.ts

# 4. Restart frontend
sudo supervisorctl restart frontend
```

## P0 — Must Have (Done)
- [x] Cairo contract with all 5 entrypoints
- [x] Contract deployment script
- [x] Feed page with dare cards
- [x] Create dare page
- [x] Dare detail page with proof submission
- [x] Voting UI
- [x] Wallet connection (get-starknet bridge, Starkzap-compatible API)

## P1 — Nice to Have (Pending)
- [ ] Real Starkzap + Privy integration (needs REACT_APP_PRIVY_APP_ID from privy.io)
- [ ] Auto-finalize cron (call /api/finalize every 5 min)
- [ ] Countdown timers auto-refresh while voting
- [ ] Starkscan TX link previews

## P2 — Future / Backlog
- [ ] Multi-claimer support
- [ ] Mainnet deployment
- [ ] Push notifications (dare claimed, vote cast)
- [ ] Image upload (currently URL-only)
- [ ] Dispute resolution mechanism
- [ ] ENS/StarknetID display names
