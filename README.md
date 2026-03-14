# Dare Board

Dare Board is a Starknet-based challenge board where anyone can post a public dare, lock a token reward in escrow, and let the community decide whether submitted proof deserves payout.

## Repo Layout

```text
.
├── dare-board/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/
│   │   │   │   │   ├── dare/[id]/route.ts
│   │   │   │   │   ├── dares/route.ts
│   │   │   │   │   └── finalize/route.ts
│   │   │   │   ├── create/page.tsx
│   │   │   │   ├── dare/[id]/page.tsx
│   │   │   │   ├── profile/page.tsx
│   │   │   │   ├── globals.css
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── providers.tsx
│   │   │   ├── components/
│   │   │   ├── context/
│   │   │   └── lib/
│   │   ├── next.config.mjs
│   │   ├── package.json
│   │   ├── postcss.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   ├── tsconfig.typecheck.json
│   │   └── vercel.json
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── dare_board.cairo
│   │   │   └── lib.cairo
│   │   ├── scripts/
│   │   │   ├── deploy.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── Scarb.toml
│   │   └── snfoundry.toml
│   ├── backend/
│   │   └── ... legacy Express scaffold
│   └── deploy.sh
├── prd.md
└── skill.md
```

- `dare-board/` is the single product workspace.
- `dare-board/frontend/` is the active product app.
- `dare-board/contracts/` holds the Cairo escrow + voting contract and deployment tooling.
- `dare-board/backend/` is legacy and no longer powers the live Dare Board flow.

## Current App Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Starknet.js
- `@starknet-io/get-starknet-core` wallet bridge

## Core Routes

- `/` — public dare feed
- `/create` — create and fund a dare
- `/dare/[id]` — claim, proof, voting, and finalize flow
- `/profile` — connected wallet activity
- `/api/dares` — serialized feed data
- `/api/dare/[id]` — serialized single dare data
- `/api/finalize` — optional cron target for auto-finalization

## Frontend Environment

Use `dare-board/frontend/.env.local` for local secrets and runtime config:

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
# frontend
cd dare-board/frontend
npm install
npm run dev
npm run typecheck
npm run build

# contracts
cd dare-board/contracts
scarb build

# deploy contract and boot the frontend
DEPLOYER_PRIVATE_KEY=0x... ./dare-board/deploy.sh
```

## Notes

- If `NEXT_PUBLIC_CONTRACT_ADDRESS` is missing, the app falls back to seeded demo dares for read flows.
- Title values are stored on-chain as `felt252`, so the UI limits titles to 31 ASCII characters.
- The active product no longer depends on the legacy Express backend.
