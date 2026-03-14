# Skill: Maintain Dare Board Next.js App

## Goal

Work on Dare Board, a Starknet Sepolia dare-and-reward app built with Next.js App Router and a Cairo contract.

The active product surface is the Next.js app in `dare-board/frontend/`. The legacy Express backend in `dare-board/backend/` is not part of the main runtime path anymore.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Starknet.js
- `@starknet-io/get-starknet-core`
- Cairo / Scarb for contracts

## Key Directories

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
    next.config.mjs
    package.json
    tailwind.config.js
    tsconfig.json
    tsconfig.typecheck.json
    vercel.json

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

  backend/
    ... legacy Express scaffold
```

## Working Rules

1. Keep frontend code in TypeScript only.
2. Prefer App Router patterns; do not reintroduce React Router or CRA-style bootstrapping.
3. Keep wallet-dependent UI in client components.
4. Keep `DEPLOYER_PRIVATE_KEY`, `DEPLOYER_ACCOUNT_ADDRESS`, and `CRON_SECRET` server-only.
5. All user write actions must continue to use the wallet abstraction and `wallet.execute(...)`.
6. Do not bypass contract logic with server mutations.
7. Preserve demo-mode behavior when no contract address is configured.
8. Remember that dare titles are stored as `felt252`; do not exceed 31 ASCII characters.

## Environment Model

Use `dare-board/frontend/.env.local` for local config:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_RPC_URL=https://starknet-sepolia-rpc.publicnode.com
NEXT_PUBLIC_STARKSCAN_URL=https://sepolia.starkscan.co
DEPLOYER_ACCOUNT_ADDRESS=
DEPLOYER_PRIVATE_KEY=
CRON_SECRET=
```

## Frontend Behavior Summary

- `/` shows the feed and polls every 15 seconds.
- `/create` validates form input and posts a dare with `approve + create_dare` multicall.
- `/dare/[id]` handles claim, proof submission, voting, and finalization.
- `/profile` shows posted and claimed dares for the connected wallet.
- `VotePanel` blocks the poster and claimer from voting.
- `ProofModal` submits proof URL and description on-chain.

## API Route Behavior

- `/api/dares` returns serialized dares for read-only integrations.
- `/api/dare/[id]` returns one serialized dare.
- `/api/finalize` is for cron-style finalization and must use server credentials only.

## Contract Integration Notes

- Contract reads and writes are centralized in `dare-board/frontend/src/lib/contract.ts`.
- ABI lives in `dare-board/frontend/src/lib/abi.json`.
- Deployment script updates both ABI and `NEXT_PUBLIC_CONTRACT_ADDRESS`.
- Use `addressesMatch(...)` and normalized addresses when comparing wallet identities.

## Safe Change Strategy

When updating this repo:

1. Check whether the change belongs in the Next app, the Cairo contract, or both.
2. If the contract shape changes, update the ABI sync path and frontend decoders.
3. If the route or component is wallet-dependent, make it a client component.
4. Run `npm run typecheck` and `npm run build` in `dare-board/frontend/` after changes.
5. If deployment logic changes, verify `dare-board/contracts/scripts/deploy.ts` still writes values into `dare-board/frontend/.env.local`.

## Common Commands

```bash
cd dare-board/frontend && npm install
cd dare-board/frontend && npm run dev
cd dare-board/frontend && npm run typecheck
cd dare-board/frontend && npm run build

cd dare-board/contracts && scarb build
DEPLOYER_PRIVATE_KEY=0x... ./dare-board/deploy.sh
```

## Avoid

- Reintroducing CRA files or React Router.
- Hardcoding secrets in code or docs.
- Using server routes for client-owned wallet writes.
- Breaking the demo fallback for read flows.
