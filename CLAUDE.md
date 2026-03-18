# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run typecheck    # TypeScript check (uses tsconfig.typecheck.json)

# Cairo contract (from contracts/)
scarb build          # Compile Cairo contract
scarb test           # Run Cairo tests (15 tests passing)

# Deploy contract + start frontend
DEPLOYER_PRIVATE_KEY=0x... ./deploy.sh
```

No test runner or linter is configured for the frontend — `typecheck` is the only validation step.

## Architecture

### Frontend (Next.js App Router)

- **Providers**: `providers.tsx` wraps the app in `ThemeProvider` → `ToastProvider` → `WalletProvider` (order matters — wallet needs toast access).
- **Wallet flow**: `starkzap.ts` initializes StarkZap SDK with AVNU paymaster and handles three wallet paths:
  1. **Extension wallets** (Argent X + Braavos) via `@starknet-io/get-starknet-core` v4 — user pays gas
  2. **Cartridge Controller** via `starkzapSdk.connectCartridge()` — social login, built-in paymaster (zero gas)
  3. **Privy social login** (Email/Google/Apple) — partially implemented, not yet committed
- Returns a `WalletAccount` abstraction that normalizes calldata before sending to wallet extensions.
- **Extension wallets CANNOT use AVNU paymaster** — paymaster requires co-signing before user wallet signs, but extensions sign internally.
- **Contract interaction**: `contract.ts` is the single entry point for all read/write calls. Read functions use a shared `RpcProvider` with fallback chain (Alchemy → BlastAPI → Nethermind). Write functions take a `WalletAccount` and call `wallet.execute()` with raw calldata arrays.
- **Legacy contracts**: The app reads dares from previous contract deployments (configured via `NEXT_PUBLIC_LEGACY_CONTRACTS`). Legacy dares are read-only — no write interactions.
- **Theme**: `ThemeContext.tsx` manages dark/light mode with CSS variable theming, localStorage persistence, and system preference detection.
- **Starknet.id**: `starknetId.ts` resolves addresses to `.stark` names with in-memory caching. `StarknetAddress` component and `useStarknetId` hook used throughout.

### Contract (Cairo)

Single file: `contracts/src/dare_board.cairo`. Dare lifecycle: Open → Claimed → Voting → Approved/Rejected/Expired/Cancelled. The contract handles ERC20 `transfer_from`/`transfer` for reward locking and distribution. All ERC20 return values are asserted.

15 snfoundry tests in `contracts/tests/test_dare_board.cairo` covering full lifecycle, access control, vote threshold, cancel, and expiry.

### Key Patterns

- **Address comparison**: Always use `addressesMatch()` from `config.ts` (compares via `BigInt`). Never use string equality on addresses.
- **Token amounts**: All amounts are u256 in wei. Use `getTokenDecimals()` for the correct decimal count per token (STRK/ETH=18, USDC/USDT=6, WBTC=8). Use `formatAmount()` for display.
- **ERC20 approve + create_dare**: Must be a single multicall via `wallet.execute([approve, create])`.
- **Error handling**: All contract errors go through `decodeContractError()` in `utils.ts` before displaying to users via toast.
- **Status decoding**: `decodeStatus()` in `contract.ts` handles three formats: CairoCustomEnum `.activeVariant()`, variant object, and legacy numeric encoding.
- **Categories**: Stored as `\n[tags:fitness,food]` suffix in dare description. Parsed and stripped on read by `categories.ts`.
- **Paymaster proxy**: Client-side calls go through `/api/paymaster` which injects `AVNU_API_KEY` server-side. Never expose API key to client.

### Environment Variables

Frontend (NEXT_PUBLIC_*): `CONTRACT_ADDRESS`, `STARKNET_NETWORK` (sepolia/mainnet), `RPC_URL`, `LEGACY_CONTRACTS`, `PRIVY_APP_ID`

Server-only: `DEPLOYER_PRIVATE_KEY` (never expose as NEXT_PUBLIC_), `CRON_SECRET` (for finalize automation), `AVNU_API_KEY` (paymaster proxy), `PRIVY_APP_SECRET` (future)

### Finalize Automation

GitHub Actions cron (`.github/workflows/finalize-cron.yml`) calls `/api/finalize` every 5 minutes with `Authorization: Bearer $CRON_SECRET`.

## Model Routing

- Cairo contract changes → use Opus 4
- Everything else (frontend, config, etc.) → Sonnet 4.6
