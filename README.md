<p align="center">
  <img src="https://img.shields.io/badge/Starknet-Sepolia-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTYgMEMxMi44IDAgOS44IDEgNy4yIDIuOCA0LjYgNC43IDIuNyA3LjMgMS42IDEwLjQuNSAxMy41LjMgMTYuOCAxIDIwYy43IDMuMiAyLjMgNi4xIDQuNSA4LjRzNSAzLjkgOC4xIDQuNmMzLjEuNyA2LjQuNSA5LjQtLjYgMy0xLjEgNS42LTMgNy40LTUuNiAxLjgtMi42IDIuOC01LjYgMi44LTguOCAwLTQuMi0xLjctOC4zLTQuNy0xMS4zQzI1LjUgMy43IDIwLjkgMiAxNiAyIiBmaWxsPSIjZmZmIi8+PC9zdmc+" alt="Starknet" />
  <img src="https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Cairo-Contract-orange?style=for-the-badge" alt="Cairo" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<h1 align="center">Dare Board</h1>

<p align="center">
  <strong>On-chain social challenges with crypto bounties on Starknet</strong>
</p>

<p align="center">
  <a href="https://dareboard.vercel.app">Live App</a> &bull;
  <a href="https://sepolia.voyager.online/contract/0x04efdb284186b5d96b177f53cd69653348620d45833e7f49440a052f3fafb0f5">Contract on Voyager</a> &bull;
  <a href="https://sepolia.starkscan.co/contract/0x04efdb284186b5d96b177f53cd69653348620d45833e7f49440a052f3fafb0f5">Contract on Starkscan</a>
</p>

---

## How It Works

```
  POST A DARE          CLAIM IT           SUBMIT PROOF         COMMUNITY VOTES        PAYOUT
 ┌──────────┐       ┌──────────┐       ┌──────────────┐      ┌──────────────┐     ┌──────────┐
 │  Create a │       │ Someone  │       │  Claimer     │      │  Community   │     │  Winner  │
 │  challenge│──────>│ accepts  │──────>│  uploads     │─────>│  votes       │────>│  gets    │
 │  + lock   │       │ the dare │       │  proof       │      │  approve /   │     │  reward  │
 │  reward   │       │          │       │  (link/media)│      │  reject      │     │  (- 1%)  │
 └──────────┘       └──────────┘       └──────────────┘      └──────────────┘     └──────────┘
    1% fee                                                     Min 3 votes           Treasury
    to treasury                                                24h window            gets 1%
```

1. **Post** — Create a dare, set a reward in STRK/ETH/USDC, define a deadline. 1% platform fee is deducted.
2. **Claim** — Anyone (except the poster) can claim the dare before the deadline.
3. **Prove** — The claimer submits proof (YouTube link, image, description). A 24-hour voting window opens.
4. **Vote** — Community members vote to approve or reject the proof. Minimum 3 votes required.
5. **Finalize** — After voting ends: approved = claimer gets reward (minus 1% fee); rejected = poster gets refund.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-wallet support** | Argent X, Braavos, Cartridge Controller (social login), Privy (email/Google/Apple) |
| **Gasless transactions** | AVNU paymaster for Privy wallets, Cartridge built-in paymaster |
| **Platform fees** | 1% on dare creation + 1% on successful claim, sent to treasury |
| **Admin panel** | On-chain delist/relist dares, owner-gated access |
| **Legacy contracts** | Read-only display of dares from previous contract deployments |
| **Auto-finalization** | GitHub Actions cron job calls `/api/finalize` every 5 minutes |
| **Starknet.id** | Resolves `.stark` names for all addresses |
| **Dark/Light mode** | Full theme support with CSS variable system |
| **Leaderboard** | Top earners, top posters, most voted dares |
| **Dare of the Day** | Daily featured dare with rotation algorithm |
| **Categories** | Tag dares with fitness, food, social media, etc. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                 │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Feed   │  │  Create  │  │  Detail  │  │ Profile │ │
│  │  Page   │  │  Page    │  │  Page    │  │  Page   │ │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │            │             │              │       │
│  ┌────┴────────────┴─────────────┴──────────────┴────┐  │
│  │              contract.ts (Read/Write)             │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │                                  │
│  ┌────────────────────┴──────────────────────────────┐  │
│  │           WalletContext (3 wallet paths)           │  │
│  │   Extension │ Cartridge │ Privy (via StarkZap)    │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │ RPC
┌──────────────────────────┴──────────────────────────────┐
│              STARKNET SEPOLIA                            │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │           DareBoard Contract (Cairo)              │  │
│  │                                                   │  │
│  │  create_dare()    claim_dare()    submit_proof()  │  │
│  │  cast_vote()      finalize_dare() cancel_dare()   │  │
│  │  delist_dare()    relist_dare()   get_treasury()  │  │
│  │                                                   │  │
│  │  Storage: dares, votes, delisted, owner, treasury │  │
│  │  Events: DareCreated, VoteCast, FeeCollected ...  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  ERC20 STRK  │  │  ERC20 ETH   │  │  ERC20 USDC  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| **Smart Contract** | Cairo (Starknet), snforge tests |
| **Wallet SDK** | StarkZap SDK, @starknet-io/get-starknet-core v4, starknet.js v6 |
| **Auth** | Privy (email/social), Cartridge Controller |
| **Gas Sponsorship** | AVNU Paymaster (Privy), Cartridge built-in |
| **Deployment** | Vercel (frontend), Starknet Sepolia (contract) |
| **Automation** | GitHub Actions cron (finalize every 5 min) |
| **Fonts** | Space Grotesk + IBM Plex Mono |
| **Icons** | lucide-react |

---

## Project Structure

```
.
├── contracts/
│   ├── src/
│   │   └── dare_board.cairo          # Main contract (dares, voting, fees, admin)
│   ├── tests/
│   │   └── test_dare_board.cairo     # 18 snforge tests
│   ├── scripts/
│   │   └── deploy.ts                 # sncast declare + deploy script
│   ├── Scarb.toml
│   └── snfoundry.toml
│
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Feed (homepage)
│   │   ├── create/page.tsx           # Create dare form
│   │   ├── dare/[id]/page.tsx        # Dare detail + voting
│   │   ├── profile/page.tsx          # User profile + activity
│   │   ├── leaderboard/page.tsx      # Rankings
│   │   ├── admin/page.tsx            # Admin panel (delist/relist)
│   │   ├── api/
│   │   │   ├── finalize/route.ts     # Auto-finalize endpoint
│   │   │   ├── paymaster/route.ts    # AVNU paymaster proxy
│   │   │   ├── dare-of-day/route.ts  # Daily featured dare
│   │   │   └── wallet/
│   │   │       ├── privy/route.ts    # Privy wallet resolver
│   │   │       └── sign/route.ts     # Privy transaction signer
│   │   ├── layout.tsx
│   │   ├── providers.tsx             # Theme > Toast > Wallet providers
│   │   └── globals.css               # Design tokens + light/dark themes
│   │
│   ├── components/
│   │   ├── Header.tsx                # Sticky nav + wallet connection
│   │   ├── DareCard.tsx              # Feed card + skeleton
│   │   ├── DareOfTheDay.tsx          # Featured dare spotlight
│   │   ├── VotePanel.tsx             # Proof display + vote buttons
│   │   ├── WalletModal.tsx           # Multi-wallet connection modal
│   │   ├── ProofModal.tsx            # Proof submission form
│   │   ├── ProofPreview.tsx          # YouTube/image/video embed
│   │   ├── StatusBadge.tsx           # Colored status pills
│   │   ├── CountdownTimer.tsx        # Live countdown display
│   │   ├── StarknetAddress.tsx       # .stark name resolution + copy
│   │   ├── ShareButton.tsx           # Copy link + X share
│   │   ├── Toast.tsx                 # Toast notification overlay
│   │   └── LoadingSpinner.tsx
│   │
│   ├── context/
│   │   ├── WalletContext.tsx          # Wallet state + 3 wallet paths
│   │   ├── ToastContext.tsx           # Toast notification system
│   │   └── ThemeContext.tsx           # Dark/light mode toggle
│   │
│   └── lib/
│       ├── contract.ts               # All contract read/write calls
│       ├── starkzap.ts               # StarkZap SDK init + wallet helpers
│       ├── config.ts                 # Tokens, addresses, helpers
│       ├── types.ts                  # TypeScript types
│       ├── utils.ts                  # Error decoder + cn()
│       ├── abi.json                  # Contract ABI
│       ├── categories.ts             # Dare category tags
│       ├── dareTemplates.ts          # Quick-start templates
│       └── starknetId.ts             # .stark name resolution
│
├── .github/workflows/
│   └── finalize-cron.yml             # Every 5 min finalize automation
│
├── deploy.sh                         # Build + declare + deploy + start
├── V0_UI_REDESIGN.md                 # UI/UX redesign brief for v0
└── CLAUDE.md                         # AI coding guidelines
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Scarb](https://docs.swmansion.com/scarb/) (Cairo package manager)
- [snforge](https://github.com/foundry-rs/starknet-foundry) (testing)
- [sncast](https://github.com/foundry-rs/starknet-foundry) (deployment)

### Install & Run

```bash
# Install frontend dependencies
npm install

# Start development server
npm run dev

# TypeScript check (the only validation step)
npm run typecheck
```

### Cairo Contract

```bash
cd contracts

# Build
scarb build

# Run tests (18 tests)
scarb test   # or: snforge test

# Deploy (requires funded deployer account)
cd ..
DEPLOYER_PRIVATE_KEY=0x... ./deploy.sh
```

---

## Smart Contract

**Address (Sepolia):** `0x04efdb284186b5d96b177f53cd69653348620d45833e7f49440a052f3fafb0f5`

**Class Hash:** `0x6fedc265a85f7700bc856d928e88aae4a3e4f29b74984fb5cea9845b507a015`

### Dare Lifecycle

```
  Open ──> Claimed ──> Voting ──> Approved (claimer paid)
   │          │           │
   │          │           └──> Rejected (poster refunded)
   │          │
   └──> Expired (poster refunded, if deadline passed)
   │
   └──> Cancelled (poster refunded, poster-initiated)
```

### Contract Functions

| Function | Access | Description |
|----------|--------|-------------|
| `create_dare` | Anyone | Post a dare with ERC20 reward. 1% creation fee to treasury. |
| `claim_dare` | Anyone (not poster) | Claim an open dare before deadline. |
| `submit_proof` | Claimer only | Submit proof URL + description. Starts 24h voting. |
| `cast_vote` | Anyone (not poster/claimer) | Vote approve or reject. One vote per address. |
| `finalize_dare` | Anyone | Finalize after voting/expiry. Distributes funds. |
| `cancel_dare` | Poster only | Cancel an unclaimed dare. Refunds escrowed amount. |
| `delist_dare` | Owner only | Hide a dare from the feed (admin moderation). |
| `relist_dare` | Owner only | Unhide a delisted dare. |
| `get_dare` | View | Read dare data by ID. |
| `get_dare_count` | View | Total number of dares. |
| `is_delisted` | View | Check if a dare is delisted. |
| `get_treasury` | View | Treasury address receiving fees. |
| `get_owner` | View | Admin/owner address. |

### Fee Structure

```
Creator posts 100 STRK dare:
  ├── 1 STRK (1%) ──> Treasury
  └── 99 STRK ──> Escrowed in contract

If approved:
  ├── 0.99 STRK (1% of 99) ──> Treasury
  └── 98.01 STRK ──> Claimer (winner)

If rejected/expired/cancelled:
  └── 99 STRK ──> Poster (full escrow refund)
```

---

## Environment Variables

### Frontend (`NEXT_PUBLIC_*` — baked at build time)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Current DareBoard contract address |
| `NEXT_PUBLIC_STARKNET_NETWORK` | `sepolia` or `mainnet` |
| `NEXT_PUBLIC_RPC_URL` | Primary Starknet RPC endpoint |
| `NEXT_PUBLIC_LEGACY_CONTRACTS` | Comma-separated old contract addresses |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy application ID |

### Server-only (never exposed to browser)

| Variable | Description |
|----------|-------------|
| `DEPLOYER_PRIVATE_KEY` | Contract deployer Stark private key |
| `CRON_SECRET` | Auth token for `/api/finalize` |
| `AVNU_API_KEY` | AVNU paymaster API key |
| `PRIVY_APP_SECRET` | Privy server secret |
| `PRIVY_AUTHORIZATION_PRIVATE_KEY` | Privy wallet signing key |
| `PRIVY_AUTHORIZATION_KEY_ID` | Privy authorization key ID |

---

## Wallet Integration

| Wallet | Type | Gas | How |
|--------|------|-----|-----|
| **Argent X** | Browser extension | User pays | `@starknet-io/get-starknet-core` |
| **Braavos** | Browser extension | User pays | `@starknet-io/get-starknet-core` |
| **Cartridge** | Social login | Free (built-in paymaster) | `starkzapSdk.connectCartridge()` |
| **Privy** | Email/Google/Apple | Free (AVNU paymaster) | `starkzapSdk.onboard({ strategy: Privy })` |

---

## Automation

The finalize cron runs via GitHub Actions (`.github/workflows/finalize-cron.yml`) every 5 minutes:

```yaml
on:
  schedule:
    - cron: '*/5 * * * *'
```

It calls `POST /api/finalize` with `Authorization: Bearer $CRON_SECRET`. The endpoint scans all dares and finalizes any that are past their voting/deadline window.

**Required GitHub Secrets:** `FINALIZE_URL`, `CRON_SECRET`

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make changes and run `npm run typecheck`
4. For Cairo changes, run `scarb test` (all 18 tests must pass)
5. Commit and push
6. Open a PR

---

## License

MIT

---

<p align="center">
  Built on <a href="https://starknet.io">Starknet</a> &bull; Deployed on <a href="https://vercel.com">Vercel</a>
</p>
