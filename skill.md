# Skill: Maintain Dare Board Root Next.js App

## Goal

Work on Dare Board, a Starknet Sepolia dare-and-reward app built with Next.js App Router and a Cairo contract.

The active app now lives directly in `dare-board/`. Smart contracts remain in `dare-board/contracts/`, which is the preferred setup. The old backend is parked in `dare-board/legacy/backend/` and is not part of the active runtime.

## Preferred Structure

- Keep the web app rooted at `dare-board/`
- Keep Cairo contracts in `dare-board/contracts/`
- Keep non-active backend code under `dare-board/legacy/`

This is the best balance because the web app and contracts use different toolchains and should not be mixed into the same source tree.

## Key Directories

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

## Rules

1. Keep app code in TypeScript only.
2. Keep wallet-dependent UI in client components.
3. Do not reintroduce React Router or a nested frontend app directory.
4. Keep `DEPLOYER_PRIVATE_KEY`, `DEPLOYER_ACCOUNT_ADDRESS`, and `CRON_SECRET` server-only.
5. All user writes must still flow through the wallet abstraction and `wallet.execute(...)`.
6. Keep demo-mode behavior for read flows when no contract address exists.
7. Keep the contract isolated in `contracts/`; do not move Cairo files into `src/`.

## Environment Model

Use `dare-board/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_RPC_URL=https://starknet-sepolia-rpc.publicnode.com
NEXT_PUBLIC_STARKSCAN_URL=https://sepolia.starkscan.co
DEPLOYER_ACCOUNT_ADDRESS=
DEPLOYER_PRIVATE_KEY=
CRON_SECRET=
```

## Commands

```bash
cd dare-board && npm install
cd dare-board && npm run dev
cd dare-board && npm run typecheck
cd dare-board && npm run build

cd dare-board/contracts && scarb build
DEPLOYER_PRIVATE_KEY=0x... ./dare-board/deploy.sh
```

## Integration Notes

- Contract reads and writes are centralized in `dare-board/src/lib/contract.ts`.
- ABI lives in `dare-board/src/lib/abi.json`.
- Deployment script writes ABI and `NEXT_PUBLIC_CONTRACT_ADDRESS` back into the app root.
- Use normalized address comparisons for poster/claimer/voter checks.
