# Dare Board — PRD v6 (Master Document)

> **Live:** https://dareboard.vercel.app
> **Repo:** https://github.com/UtkarshArjariya/Starkzap
> **Stack:** Next.js 16 App Router · TypeScript · Tailwind · Cairo 2.x · starknet.js v6.11 · StarkZap SDK
> **Fonts:** Space Grotesk (sans) + IBM Plex Mono (mono)
> **Last updated:** 2026-03-21

---

## 1. Current `.env.local` (Ground Truth)

```env
# Frontend — baked in at build time (safe for browser)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x05293f7708c819dbfc1cc9f004419e9d306ca0eb3c00a0e5955d73f565eb6803
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
NEXT_PUBLIC_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/FpjFg5i2ZpZbNz7lXotzq/
NEXT_PUBLIC_PRIVY_APP_ID=cmmqagmlz00dp0ci6ur9g3p7y
# Explorer URL is auto-derived from STARKNET_NETWORK in config.ts (Voyager)

# Legacy contract addresses — dares shown read-only in feed
NEXT_PUBLIC_LEGACY_CONTRACTS=0x5c1133ffe3abc39dad78291b898b2e5637e109efc03f0f03eeec41d77e1706b,0x030857207b1130b26db3b522f6e3e96ba848cc0e751c6c87f475ed8381cd4999

# Server-only — never in NEXT_PUBLIC_ vars, never committed to git
DEPLOYER_PUBLIC_KEY=<deployer wallet public key>
DEPLOYER_PRIVATE_KEY=<deployer wallet private key — NEVER commit this>
CONTRACT_CLASS_HASH=<declared class hash from sncast>
CRON_SECRET=<generate: openssl rand -hex 32 — same in Vercel AND GitHub Actions secrets>
AVNU_API_KEY=<AVNU paymaster API key — server-only, used by /api/paymaster proxy>
PRIVY_APP_SECRET=<from privy.io → Settings → API Keys — needed for Privy backend routes>
```

> Missing from production:
> - `CRON_SECRET` — auto-finalize silently 401s without this
> - `AVNU_API_KEY` — needed for gasless transactions via paymaster proxy
> - `PRIVY_APP_SECRET` — needed once Privy social login lands

---

## 2. Architecture (from CLAUDE.md)

### Key Patterns — Must Follow in All Code

```
addressesMatch()        ← always use this from config.ts (BigInt comparison). NEVER string equality on addresses.
formatAmount()          ← token amounts are u256 wei. Use getTokenDecimals() for correct decimals per token.
decodeContractError()   ← all contract errors go through this in utils.ts before showing to user via toast.
decodeStatus()          ← handles 3 formats: CairoCustomEnum .activeVariant(), variant object, legacy numeric.
wallet.execute()        ← all write txs go through WalletAccount.execute() — never direct starknet.js account calls.
encodeShortStringFixed() ← use this, NOT starknet.js encodeShortString (broken for \n chars).
```

### Provider Order (must not change)
```
ThemeProvider → ToastProvider → WalletProvider
```
WalletProvider needs toast access. Reversing this breaks toast-on-wallet-error.

### Wallet Flow
Three paths in `WalletModal.tsx`:
1. **Extension** (Argent X + Braavos) — `@starknet-io/get-starknet-core` v4. User pays gas.
2. **Cartridge Controller** — StarkZap SDK `connectCartridge()`. Social login + built-in paymaster (zero gas).
3. **Privy** (Email/Google/Apple) — StarkZap SDK `onboard()`. Not yet committed (runtime errors).

Extension wallets CANNOT use AVNU paymaster — paymaster requires co-signing before the user's wallet signs internally.

### Legacy Contract Support
The app reads dares from previous deployments via `NEXT_PUBLIC_LEGACY_CONTRACTS` (comma-separated). Legacy dares are read-only — no write interactions.

### Known Bug Fixes (do not revert)
| Bug | Fix Applied |
|---|---|
| "Invalid block_id" on Alchemy RPC v0_10 | `blockIdentifier: "latest"` in RpcProvider — never use `"pending"` |
| Broken calldata from `encodeShortString` | Custom `encodeShortStringFixed()` + `stringToByteArrayCalldata()` |
| Deploy script "Cannot convert undefined to BigInt" | Rewrote to use `sncast` CLI instead of starknet.js Account |
| Generic error messages hiding real errors | felt252 hex decoding + quoted reason extraction in `decodeContractError` |
| Unchecked ERC20 return values | `assert()` on all 6 transfer/transfer_from calls in contract |

---

## 3. Completed Work

### Smart Contract (Cairo)
- [x] Full dare lifecycle: create → claim → proof → vote → finalize
- [x] `cancel_dare` — poster can cancel Open dare and reclaim reward
- [x] Minimum 3 votes required before finalization (`MIN_VOTES_TO_FINALIZE`)
- [x] `Cancelled` status variant added to enum
- [x] ERC20 escrow: STRK + ETH (contract accepts any ERC20)
- [x] Security audit: assert all 6 ERC20 return values (transfer + transfer_from)
- [x] 18 snfoundry tests with MockERC20 (lifecycle, access control, vote threshold, cancel, expiry)
- [x] snforge_std v0.57.0 configured

### Frontend Features
- [x] Paginated feed (20/page) with load-more + skeleton loading + 15s poll
- [x] Status filters (All, Open, Voting, Approved, etc.)
- [x] 8 dare categories (fitness, food, social, skills, gaming, creative, weird, finance) with filter chips
- [x] 6 dare templates on create page (pre-fill form fields)
- [x] Dare of the Day banner (highest votes or reward, hourly revalidation)
- [x] Leaderboard page — 3 tabs: top earners, top posters, most voted dares
- [x] Starknet.id name resolution (`StarknetAddress` component + `useStarknetId` hook)
- [x] OG image generation (`/api/og/[id]` — 1200×630 social preview)
- [x] Dynamic meta tags (og:image, Twitter cards) via `generateMetadata()` in dare layout
- [x] Activity timeline on profile page (created, claimed, voted, won, cancelled events)
- [x] Dark/light mode toggle (ThemeContext, CSS variables, localStorage, system preference)
- [x] Toast notifications for all write txs (ToastContext + Toast.tsx, max 3, 5s auto-dismiss)
- [x] Human-readable decoded error messages (`decodeContractError()`)
- [x] Proof preview: YouTube embed, image/video inline, imgur, link card fallback
- [x] Share buttons: copy link + X intent
- [x] Vote threshold progress indicator (X/3)
- [x] Expiry warning banners (deadline <6h, voting <2h)
- [x] Cancel dare button (poster only, Open status, confirmation dialog)
- [x] Legacy contract dares shown read-only with badge
- [x] Mobile-responsive layout with bottom-sheet modals
- [x] Wallet network guard (warns if wrong network)
- [x] Confetti animation on Approved dares
- [x] Voyager explorer links throughout UI
- [x] Modern UI (new-look) with glass panels, live ticker, real notifications, wallet balance display
- [x] UIContext for classic/modern UI toggle with AdaptiveHeader
- [x] Settings modal with real theme + UI mode controls

### Wallet & SDK
- [x] Extension wallets (Argent X + Braavos) via `@starknet-io/get-starknet-core` v4
- [x] StarkZap SDK initialized with AVNU paymaster
- [x] Cartridge Controller social login via `starkzapSdk.connectCartridge()` with session policies
- [x] Server-side paymaster proxy (`/api/paymaster`) — hides AVNU API key
- [x] Calldata normalization (hex conversion for wallet extensions)

### Infrastructure
- [x] GitHub Actions auto-finalize cron (every 5 min)
- [x] Deploy script rewritten to use `sncast` CLI
- [x] RPC fallback chain (Alchemy → BlastAPI → Nethermind) with cached provider
- [x] Multi-decimal token support via StarkZap presets (USDC=6, WBTC=8, STRK/ETH=18)
- [x] Legacy contract migration support
- [x] Vercel Speed Insights + Analytics

---

## 4. Remaining Work

### P1 — Critical Blockers

#### 4.1 Set CRON_SECRET (Manual — No Code)
**Why:** Every GitHub Actions finalize run returns 401. Dares with closed voting windows never distribute rewards.

**Steps:**
1. `openssl rand -hex 32` → copy output
2. Vercel dashboard → Settings → Environment Variables → Add `CRON_SECRET=<value>`
3. GitHub repo → Settings → Secrets → Actions → Add `CRON_SECRET=<same value>`
4. Manually trigger the GitHub Action → confirm 200 response

#### 4.2 Set AVNU_API_KEY in Vercel (Manual — No Code)
**Why:** `/api/paymaster` proxy needs this to forward gasless tx requests to AVNU.

**Steps:**
1. Get API key from AVNU dashboard
2. Vercel dashboard → Settings → Environment Variables → Add `AVNU_API_KEY=<value>`

#### 4.3 Privy Social Login (Email/Google/Apple)
**Why:** Mobile users can't install browser extensions. Privy enables sign-in with Google/Apple/email, zero gas fees via StarkZap paymaster.

**Status:** Partially built, not committed. Runtime errors during login. Needs debugging.

**What exists (uncommitted):**
- `src/app/providers.tsx` — PrivyProvider wrapping
- `src/components/WalletModal.tsx` — Privy login option (Email/Google/Apple)
- `src/context/WalletContext.tsx` — Privy wallet type handling + disconnect
- `src/lib/starkzap.ts` — `connectPrivyWallet()` + `disconnectPrivyWallet()`

**What needs to be built:**
- `src/app/api/wallet/privy/route.ts` — Server route: verify Privy token, resolve/create Starknet wallet
- `src/app/api/wallet/sign/route.ts` — Server route: auth-protected transaction signing via Privy
- Debug Privy login error (likely dashboard config: allowed origins, login methods, or API version mismatch)
- Set `PRIVY_APP_SECRET` in Vercel

**Packages needed:** `@privy-io/react-auth`, `@privy-io/node`

**Model:** Use **Opus 4** for server routes + wallet lifecycle. Sonnet for UI.

---

### P2 — Platform Depth

#### 4.4 Starknet Indexer (Apibara/Torii)
**Why:** RPC batch reads won't scale past 500+ dares. Currently fetching all dares via direct contract calls.

- Apibara DNA stream listens to contract events
- Writes to Supabase (free tier: 500MB Postgres)
- Replace `/api/dares` RPC call with Supabase query
- Enables: leaderboard without full scan, global search, activity feeds
- Estimated lift: 10× faster feed loads, no RPC rate limits

#### 4.5 Farcaster Frames
**Why:** Crypto-native users on Farcaster are exactly Dare Board's audience. Post any dare as a Frame — viewers vote or claim without leaving Warpcast.

- Build with `frog` framework or `@coinbase/onchainkit`
- Frame shows: dare title, reward, status, Approve/Reject buttons
- `/api/frames/[id]/route.ts` — frame metadata + transaction response

#### 4.6 Discord Bot
**Why:** Distribution for crypto Discord communities.

- `/dare list` → 5 open dares
- `/dare [id]` → dare details + claim link
- `/dare create` → form to post a dare from Discord
- Deploy as `discord.js` bot on Render.com or Railway

---

### P3 — Production Ready

#### 4.7 Contract Security Review (Pre-Mainnet)
**What's done:** ERC20 return value assertions, 18 test cases.
**What's left:** Full adversarial audit before mainnet:
- Reentrancy analysis (Starknet execution model)
- Integer overflow in vote counts, reward amounts, timestamps
- `block_timestamp` manipulation vectors
- Edge cases in finalization logic

#### 4.8 Admin Functions
The `owner` field is stored but unused. Add before mainnet:
- `pause()` / `unpause()` — emergency stop
- `set_fee(fee_bps, treasury)` — protocol fee (max 5%)
- `assert(!self.paused.read(), 'contract_paused')` on all write entrypoints
- Fee deduction in `finalize_dare` before paying claimer

**Model:** Use **Opus 4** for all contract changes.

#### 4.9 Mainnet Deployment
**Prerequisites:** Security review done, Privy working, admin functions added, tests passing.

```bash
NEXT_PUBLIC_STARKNET_NETWORK=mainnet
NEXT_PUBLIC_RPC_URL=<alchemy mainnet URL>
# VOYAGER_URL is auto-derived from STARKNET_NETWORK in config.ts
```

Token addresses are identical on mainnet and Sepolia for STRK, ETH.

#### 4.10 Custom Domain
1. Register `dareboard.xyz` (~$10/yr)
2. Vercel → Settings → Domains → Add
3. Update all `dareboard.vercel.app` refs

---

### P4 — Ecosystem (Post-Launch)
> Each feature needs its own mini-PRD before any code is written.

| Feature | Why | Effort |
|---|---|---|
| **Multi-claimer** | Multiple people race to complete same dare. First to win vote gets reward. Major contract rewrite. | Very High |
| **Dare tipping** | Spectators add to reward pool mid-dare. `tip_dare(id, amount)` entrypoint. Viral mechanic. | Medium |
| **Dare campaigns** | Multi-dare series with cumulative rewards. Creator mode for brands/DAOs. | High |
| **Public REST API** | Once indexer runs, expose paginated endpoints. Third-party integrations. | Medium |
| **Dare Board SDK** | `npm install @dareboard/sdk` — embed DareCard anywhere. | Medium |
| **Mobile app** | React Native + Expo + Starkzap. Push notifications, camera for proof. | High |
| **Telegram Mini App** | Full Dare Board UI inside Telegram chat. | Medium |
| **DAO governance** | Token-gated voting on platform parameters (fee %, vote threshold). | Very High |

---

## 5. UI/UX Backlog
> Assign to any available sprint. All Sonnet 4.6.

| Item | Where | Effort |
|---|---|---|
| "Similar dares" section on detail | `/dare/[id]` | M |
| USD equivalent next to STRK/ETH amounts | Global | S |
| Dare difficulty tag (Easy/Medium/Hard) | Create + detail | S |
| Progress bar at top on tx pending | Global | S |
| "Watched by X people" counter | `/dare/[id]` | M |
| Sticky header on scroll | `Header.tsx` | S |
| `N` keyboard shortcut → create page | Global | S |
| Better 404 for invalid dare IDs | `/dare/[id]` | S |
| PWA support (Add to Home Screen) | `next.config.mjs` | M |
| Emoji reactions on dare cards | `DareCard.tsx` | M |
| Internationalization (EN + Hindi) | Global | H |
| "Dare Me" personal profile pages | `/u/[address]` | M |
| On-chain comments per dare | `/dare/[id]` | H |
| Notification system (event polling) | Global | H |

---

## 6. Contract Reference

### Active Contract (Sepolia)
- Address: `0x05293f7708c819dbfc1cc9f004419e9d306ca0eb3c00a0e5955d73f565eb6803`
- Class hash: `0x6902d81d91c436381fca13439b042676bf0fbf7be672c72238c88be3dd156c2`
- ABI: `src/lib/abi.json`
- Explorer: `https://sepolia.voyager.co/contract/0x05293f...`

### Status Flow
```
Open ──────────────────────────────────────► Expired  (deadline passed)
  │                                           ▲
  ├── cancel_dare (poster) ──────────────► Cancelled  (reward → poster)
  │
  ▼ claim_dare
Claimed ───────────────────────────────────► Expired  (deadline passed)
  │
  ▼ submit_proof
Voting ── finalize (approve > reject, ≥3 votes) ──────► Approved  (reward → claimer)
       └── finalize (reject ≥ approve, OR < 3 votes) ──► Rejected  (reward → poster)
```

### All Entrypoints
| Function | Caller | Condition |
|---|---|---|
| `create_dare(title, description, token, amount, deadline)` | Anyone | Anytime |
| `claim_dare(dare_id)` | Anyone ≠ poster | Status=Open, not expired |
| `submit_proof(dare_id, url, description)` | Claimer only | Status=Claimed |
| `cast_vote(dare_id, approve)` | Anyone ≠ poster/claimer | Status=Voting, window open, not already voted |
| `finalize_dare(dare_id)` | Anyone / cron | After voting window or deadline |
| `cancel_dare(dare_id)` | Poster only | Status=Open |
| `get_dare(dare_id)` | Frontend (read) | Anytime |
| `get_dare_count()` | Frontend (read) | Anytime |
| `has_voter_voted(dare_id, voter)` | Frontend (read) | Anytime |

### Token Addresses (Sepolia = Mainnet)
| Token | Address | Decimals |
|---|---|---|
| STRK | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | 18 |
| ETH  | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` | 18 |
| USDC | From StarkZap presets | 6 |
| USDT | From StarkZap presets | 6 |
| WBTC | From StarkZap presets | 8 |

---

## 7. Commands

```bash
# Frontend
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run typecheck    # TypeScript check (uses tsconfig.typecheck.json)

# Cairo contract (from contracts/)
scarb build          # Compile Cairo contract
scarb test           # Run Cairo tests (18 tests passing)

# Deploy contract + start frontend
DEPLOYER_PRIVATE_KEY=0x... ./deploy.sh

# Deploy contract only
cd contracts/scripts && npx ts-node --project tsconfig.json deploy.ts

# Deploy frontend
vercel --prod
```

---

## 8. Security Rules (Non-Negotiable)

1. `DEPLOYER_PRIVATE_KEY` is server-only. Never in `NEXT_PUBLIC_` vars. Never logged. Ever.
2. `CRON_SECRET` must match between Vercel env and GitHub Actions secrets.
3. `AVNU_API_KEY` is server-only. Client calls go through `/api/paymaster` proxy.
4. `PRIVY_APP_SECRET` is server-only. Never in `NEXT_PUBLIC_` vars.
5. All business logic enforced on-chain. Frontend is display + UX only.
6. ERC20 approve + `create_dare` is always one multicall. Never two transactions.
7. Always `blockIdentifier: "latest"` — never `"pending"` (breaks Alchemy).
8. Always `addressesMatch()` — never string equality on addresses.
9. Legacy contracts are read-only. Never send write transactions to them.
10. Cairo security review must pass before any mainnet deployment.
11. `.env.local` in `.gitignore`. Verify before every commit.
12. All ERC20 return values must be asserted in contract code.

---

## 9. AI Agent Guide

### Model Routing

| Task | Model | Why |
|---|---|---|
| All UI components, hooks, TypeScript | Sonnet 4.6 | Fast, accurate, cheap |
| Bug fixes, Tailwind, API routes | Sonnet 4.6 | Well within capability |
| StarkZap SDK + WalletContext | **Opus 4** | Auth lifecycle, wrong = broken login |
| Privy backend routes | **Opus 4** | Server-side key management |
| Cairo contract changes | **Opus 4** | Wrong = locked funds |
| Contract security review | **Opus 4** | Adversarial reasoning required |
| Indexer architecture (Apibara) | **Opus 4** | Novel, many tradeoffs |
| Any task Sonnet failed twice | **Opus 4** | Escalate, don't retry |

**Decision rule:** Does a bug here lose money or break auth? → Opus 4. Otherwise → Sonnet 4.6.
