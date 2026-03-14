# Dare Board Frontend

Next.js App Router frontend for the Starknet-based Dare Board app.

This frontend lives inside the shared product workspace at `dare-board/frontend`.

## Stack

- Next.js 16 + TypeScript
- Tailwind CSS
- Starknet.js
- `@starknet-io/get-starknet-core` for browser wallet integration

## Environment

Create `dare-board/frontend/.env.local` with:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_RPC_URL=https://starknet-sepolia-rpc.publicnode.com
NEXT_PUBLIC_STARKSCAN_URL=https://sepolia.starkscan.co
DEPLOYER_ACCOUNT_ADDRESS=
DEPLOYER_PRIVATE_KEY=
CRON_SECRET=
```

`NEXT_PUBLIC_*` variables are exposed to the browser. `DEPLOYER_*` and `CRON_SECRET` must remain server-only.

## Commands

```bash
cd dare-board/frontend
npm install
npm run dev
npm run typecheck
npm run build
```

## App Routes

- `/` — public feed
- `/create` — create a dare
- `/dare/[id]` — dare detail, proof, voting, finalize
- `/profile` — connected wallet activity
- `/api/dares` — serialized dare feed
- `/api/dare/[id]` — single serialized dare
- `/api/finalize` — server-side finalize hook for cron jobs

## File Structure

```text
dare-board/frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dare/[id]/route.ts
│   │   │   ├── dares/route.ts
│   │   │   └── finalize/route.ts
│   │   ├── create/page.tsx
│   │   ├── dare/[id]/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── CountdownTimer.tsx
│   │   ├── DareCard.tsx
│   │   ├── Header.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ProofModal.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── VotePanel.tsx
│   │   └── WalletModal.tsx
│   ├── context/
│   │   └── WalletContext.tsx
│   └── lib/
│       ├── abi.json
│       ├── config.ts
│       ├── contract.ts
│       ├── demoData.ts
│       ├── serialize.ts
│       ├── starkzap.ts
│       ├── types.ts
│       └── utils.ts
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.typecheck.json
└── vercel.json
```
