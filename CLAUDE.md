# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dare Board** is a Starknet-based social challenge platform. Users post dares with crypto bounties, someone claims and submits proof, community votes, smart contract distributes rewards.

- **Live:** https://dareboard.vercel.app
- **Repo:** github.com/UtkarshArjariya/Starkzap
- **Network:** Starknet Sepolia (not mainnet yet)
- **Contract (Sepolia):** set via `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local`

### Dare Lifecycle

```
Open → Claimed → Voting → Approved (claimer gets reward)
                        → Rejected (poster gets refund)
Open / Claimed → Expired (deadline passed, poster refunded)
Open → Cancelled (poster cancels, poster refunded)
```

- 1% fee on creation (to treasury), 1% fee on successful claim (to treasury)
- 24-hour voting window after proof submission
- Minimum 3 votes required to finalize. Equal votes → Rejected (poster refund)

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Contract | Cairo 2.x (Starknet, edition 2024_07), snforge v0.57.0 tests |
| Wallet SDK | StarkZap v1.0.0, @starknet-io/get-starknet-core v4, starknet.js v6.24 |
| Auth | @privy-io/react-auth v3, @cartridge/controller v0.13 |
| Fonts | Space Grotesk (sans) + IBM Plex Mono (mono) |
| Icons | lucide-react (no other icon libs) |
| Deployment | Vercel (frontend), Starknet Sepolia (contract) |

## Commands

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
```

No test runner or linter is configured for the frontend — `typecheck` is the only validation step.

## Pages & Routes

### Frontend Pages (both classic + modern versions exist)

| Route | Classic Page | Modern Page (new-look) |
|-------|-------------|----------------------|
| `/` | `src/app/page.tsx` | Uses `new-look/feed-page.tsx` |
| `/create` | `src/app/create/page.tsx` | Uses `new-look/create-page.tsx` |
| `/dare/[id]` | `src/app/dare/[id]/page.tsx` | Uses `new-look/dare-detail-page.tsx` |
| `/profile` | `src/app/profile/page.tsx` | Uses `new-look/profile-page.tsx` |
| `/leaderboard` | `src/app/leaderboard/page.tsx` | Uses `new-look/leaderboard-page.tsx` |
| `/admin` | `src/app/admin/page.tsx` | (classic only) |

Each App Router page imports both classic and modern components. The pattern is:
```tsx
const { mode } = useUI();
if (mode === "modern") return <ModernFeedPage />;
return <ClassicFeedPage />;
```

### API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/dares` | GET | Fetch all dares | None |
| `/api/dare/[id]` | GET | Single dare by ID | None |
| `/api/dare-of-day` | GET | Featured dare (hourly revalidation) | None |
| `/api/leaderboard` | GET | Ranked users (5 min revalidation) | None |
| `/api/og/[id]` | GET | Dynamic OG image (1200x630) | None |
| `/api/paymaster` | POST | AVNU paymaster proxy (hides API key) | None |
| `/api/finalize` | POST | Batch finalize eligible dares | `CRON_SECRET` |
| `/api/wallet/privy` | POST | Verify Privy token, resolve Starknet wallet | `PRIVY_APP_SECRET` |
| `/api/wallet/sign` | POST | Auth-protected transaction signing via Privy | `PRIVY_APP_SECRET` |

## Architecture

### Frontend (Next.js App Router)

- **Providers**: `providers.tsx` wraps the app in `PrivyProvider` → `ThemeProvider` → `ToastProvider` → `UIProvider` → `WalletProvider` (order matters — wallet needs toast access). `PrivyProvider` is the outermost wrapper.
- **Wallet flow**: `starkzap.ts` initializes StarkZap SDK with AVNU paymaster and handles three wallet paths:
  1. **Extension wallets** (Argent X + Braavos) via `@starknet-io/get-starknet-core` v4 — user pays gas
  2. **Cartridge Controller** via `starkzapSdk.connectCartridge()` — social login, built-in paymaster (zero gas)
  3. **Privy social login** (Email/Google/Apple) — partially implemented, not yet committed
- Returns a `WalletAccount` abstraction that normalizes calldata before sending to wallet extensions.
- **Extension wallets CANNOT use AVNU paymaster** — paymaster requires co-signing before user wallet signs, but extensions sign internally.
- **Contract interaction**: `contract.ts` is the single entry point for all read/write calls. Read functions use a shared `RpcProvider` with fallback chain (Alchemy → BlastAPI → Nethermind, network-conditional URLs). Write functions take a `WalletAccount` and call `wallet.execute()` with raw calldata arrays.
- **Legacy contracts**: The app reads dares from previous contract deployments (configured via `NEXT_PUBLIC_LEGACY_CONTRACTS`). Legacy dares are read-only — no write interactions.
- **Theme**: `ThemeContext.tsx` manages dark/light mode with CSS variable theming, localStorage persistence, and system preference detection.
- **UI Mode**: `UIContext.tsx` toggles between classic and modern (new-look) UI via `useUI()` hook. `AdaptiveHeader.tsx` switches between `Header.tsx` (classic) and `new-look/header.tsx` (modern) based on mode. Toggle lives in `new-look/settings-modal.tsx`.
- **Explorer**: `VOYAGER_URL` in `config.ts` auto-derives from `STARKNET_NETWORK` (mainnet → `voyager.online`, sepolia → `sepolia.voyager.online`). Deprecated `STARKSCAN_URL` alias exists for backward compatibility. These are NOT env vars.
- **Starknet.id**: `starknetId.ts` resolves addresses to `.stark` names with in-memory caching. `StarknetAddress` component and `useStarknetId` hook used throughout.
- **Admin**: `ADMIN_ADDRESS` constant in `config.ts` gates `/admin` page access. Only this wallet can delist/relist dares.

### Modern UI (new-look)

The `src/components/new-look/` directory contains a complete alternate UI with glass-panel design:
- **header.tsx** — Modern header with real on-chain notifications (derived from dare statuses via `deriveNotifications()`), wallet balance display (STRK + ETH via `getTokenBalance()`), mobile menu with route-change auto-close.
- **feed-page.tsx** — Feed with hero section, live activity ticker, featured dare, filters, how-it-works onboarding.
- **dare-card.tsx** — Cards with urgency badges (`< 6h`), high-value badges (`>= 10 tokens`), uses `getTokenDecimals()` for correct threshold.
- **dare-detail-page.tsx** — Adaptive layout by status, uses `useState` + `setInterval` for live `now` timestamp (not computed-once).
- **create-page.tsx** — Create form with null-check after `connect()` call.
- **profile-page.tsx** / **leaderboard-page.tsx** — Use shared `getAvatarGradient()` from `new-look/utils.ts` and `shortAddress()` from `config.ts`.
- **settings-modal.tsx** — Real `useTheme()` and `useUI()` toggles, Voyager wallet link.
- **feed/live-ticker.tsx** — Accepts `dares: Dare[]` prop, derives events from real dare statuses.
- **feed/featured-dare.tsx** — Uses `<span>` (not `<Link>`) for nested link elements to avoid invalid HTML.

### Contract (Cairo)

Single file: `contracts/src/dare_board.cairo`. Dare lifecycle: Open → Claimed → Voting → Approved/Rejected/Expired/Cancelled. The contract handles ERC20 `transfer_from`/`transfer` for reward locking and distribution. All ERC20 return values are asserted.

18 snfoundry tests in `contracts/tests/test_dare_board.cairo` covering full lifecycle, access control, vote threshold, cancel, and expiry.

### DareStatus Type

`DareStatus` in `types.ts` has 7 variants: `"Open" | "Claimed" | "Voting" | "Approved" | "Rejected" | "Expired" | "Cancelled"`. All `Record<DareStatus, ...>` maps (in `StatusBadge.tsx`, `dare-card.tsx`, `dare-detail-page.tsx`) must include all 7 keys.

`STATUS_NAME_MAP` in `contract.ts` maps contract status names to frontend `DareStatus` values, including `Cancelled: "Cancelled"`.

### Token Addresses (same on Sepolia + Mainnet)

| Token | Decimals |
|-------|----------|
| STRK | 18 |
| ETH | 18 |
| USDC | 6 |
| USDT | 6 |
| WBTC | 8 |

Addresses loaded from StarkZap SDK presets in `config.ts`. Hardcoded fallbacks exist for STRK and ETH. The contract accepts any ERC20 — the frontend restricts the list.

## Key Patterns (MUST FOLLOW)

- **Address comparison**: Always use `addressesMatch()` from `config.ts` (compares via `BigInt`). Never use string equality on addresses.
- **Address display**: Use `shortAddress()` from `config.ts` for truncated display. Use `StarknetAddress` component for `.stark` name resolution.
- **Token amounts**: All amounts are u256 in wei. Use `getTokenDecimals()` for the correct decimal count per token. Use `formatAmount()` for display.
- **High-value thresholds**: When checking if a dare is "high value", always use `getTokenDecimals(dare.rewardToken)` — never hardcode `1e18`.
- **ERC20 approve + create_dare**: Must be a single multicall via `wallet.execute([approve, create])`.
- **Error handling**: All contract errors go through `decodeContractError()` in `utils.ts` before displaying to users via toast. Always use in catch blocks.
- **Status decoding**: `decodeStatus()` in `contract.ts` handles three formats: CairoCustomEnum `.activeVariant()`, variant object, and legacy numeric encoding.
- **Categories**: Stored as `\n[tags:fitness,food]` suffix in dare description. Parsed and stripped on read by `categories.ts`.
- **Paymaster proxy**: Client-side calls go through `/api/paymaster` which injects `AVNU_API_KEY` server-side. Never expose API key to client.
- **Null check after connect()**: Always check `if (!wallet) return;` after `const w = wallet ?? (await connect());` — user may dismiss the wallet modal.
- **Live timestamps**: Use `useState` + `setInterval` for `now` values that drive countdowns — never compute once at render time.
- **ZERO_ADDRESS check**: When filtering claimed dares, always check `dare.claimer !== ZERO_ADDRESS` (from `config.ts`).
- **YouTube embed safety**: Validate video IDs with `/^[a-zA-Z0-9_-]{11}$/` before embedding in iframes.
- **Nested links**: Never nest `<Link>` inside `<Link>` — use `<span>` with `onClick` for inner clickable elements.
- **Shared utilities**: `new-look/utils.ts` has `getAvatarGradient()`. Don't duplicate it in page components.
- **Mobile menu**: Both classic and modern headers close mobile menu on route change via `useEffect` watching `pathname`.

## Known Bug Fixes (DO NOT REVERT)

| Bug | Fix |
|-----|-----|
| "Invalid block_id" on Alchemy RPC | `blockIdentifier: "latest"` — never use `"pending"` |
| Broken calldata from `encodeShortString` | Custom `encodeShortStringFixed()` + `stringToByteArrayCalldata()` in contract.ts — starknet.js version drops `\n` chars |
| Deploy script BigInt errors | Uses `sncast` CLI instead of starknet.js Account |
| Generic error messages | felt252 hex decoding + quoted reason extraction in `decodeContractError()` |
| Unchecked ERC20 returns | `assert()` on all 6 transfer/transfer_from calls in Cairo contract |
| Finalize auth bypass | Route throws error when `CRON_SECRET` is unset (not silently allow) |
| Stale countdown timers | `useState` + `setInterval` for `now`, not computed-once value |

## Key Files

| Purpose | File |
|---------|------|
| Cairo contract | `contracts/src/dare_board.cairo` |
| Cairo tests | `contracts/tests/test_dare_board.cairo` |
| Contract ABI | `src/lib/abi.json` |
| Read/write contract calls | `src/lib/contract.ts` |
| Wallet helpers + StarkZap SDK | `src/lib/starkzap.ts` |
| Config, tokens, address utils, VOYAGER_URL | `src/lib/config.ts` |
| TypeScript types (Dare, DareStatus, etc.) | `src/lib/types.ts` |
| Error decoder + cn() | `src/lib/utils.ts` |
| BigInt serialization for API JSON | `src/lib/serialize.ts` |
| Dare categories | `src/lib/categories.ts` |
| Dare templates | `src/lib/dareTemplates.ts` |
| Starknet.id resolver | `src/lib/starknetId.ts` |
| Starknet.id React hook | `src/hooks/useStarknetId.ts` |
| Theme context (dark/light) | `src/context/ThemeContext.tsx` |
| UI mode context (classic/modern) | `src/context/UIContext.tsx` |
| Wallet context | `src/context/WalletContext.tsx` |
| Toast context | `src/context/ToastContext.tsx` |
| Root providers | `src/app/providers.tsx` |
| Global styles + CSS variables | `src/app/globals.css` |
| Adaptive header switcher | `src/components/AdaptiveHeader.tsx` |
| Classic header | `src/components/Header.tsx` |
| Modern header + notifications | `src/components/new-look/header.tsx` |
| Modern UI components | `src/components/new-look/` |
| Settings modal (theme + UI toggle) | `src/components/new-look/settings-modal.tsx` |
| Dare detail OG meta + generateMetadata | `src/app/dare/[id]/layout.tsx` |
| OG image generation | `src/app/api/og/[id]/route.tsx` |
| Privy wallet resolver | `src/app/api/wallet/privy/route.ts` |
| Privy transaction signer | `src/app/api/wallet/sign/route.ts` |
| Finalize automation route | `src/app/api/finalize/route.ts` |
| Paymaster proxy | `src/app/api/paymaster/route.ts` |
| GitHub Actions cron | `.github/workflows/finalize-cron.yml` |
| Deploy script | `contracts/scripts/deploy.ts` |
| PRD (full roadmap + remaining work) | `PRD.md` |
| Codebase analysis | `CODEBASE_ANALYSIS.md` |
| UI redesign brief | `V0_UI_REDESIGN.md` |

## Environment Variables

Frontend (NEXT_PUBLIC_*): `CONTRACT_ADDRESS`, `STARKNET_NETWORK` (sepolia/mainnet), `RPC_URL`, `LEGACY_CONTRACTS`, `PRIVY_APP_ID`

Server-only: `DEPLOYER_PRIVATE_KEY` (never expose as NEXT_PUBLIC_), `CRON_SECRET` (for finalize automation — must match in Vercel + GitHub Actions), `AVNU_API_KEY` (paymaster proxy), `PRIVY_APP_SECRET`, `PRIVY_AUTHORIZATION_KEY_ID`, `PRIVY_AUTHORIZATION_PRIVATE_KEY` (Privy wallet routes)

### Missing from Production (TODO)

- `CRON_SECRET` — auto-finalize silently 401s without this. Set same value in Vercel env + GitHub Actions secrets.
- `AVNU_API_KEY` — needed for gasless transactions via paymaster proxy.

## Finalize Automation

GitHub Actions cron (`.github/workflows/finalize-cron.yml`) calls `/api/finalize` every 5 minutes with `Authorization: Bearer $CRON_SECRET`. The finalize route rejects requests when `CRON_SECRET` is not configured (throws error instead of silently allowing).

## Known Issues / Backlog

- Floating-point precision in `formatAmount()` for very large token amounts (complex fix, deferred).
- Classic and modern page pairs share ~300 lines of duplicated business logic — could extract shared hooks.
- Modern (new-look) pages don't use `StarknetAddress` component (no `.stark` name resolution).
- Profile "STRK Earned" label sums all token types (not just STRK).
- Both `canvas-confetti` and `react-confetti` are installed — could deduplicate.
- Light-mode CSS has ~160 lines of `!important` overrides — fragile.
- Privy social login partially built but not committed (runtime errors during login).

## Model Routing

- Cairo contract changes → use Opus 4
- Everything else (frontend, config, etc.) → Sonnet 4.6

## Git Conventions

- Never add `Co-Authored-By` or AI attribution lines to commit messages.
