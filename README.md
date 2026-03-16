# Dare Board App

This is the main Dare Board application directory.

The preferred structure is:
- Next.js app at the root of `dare-board/`
- Cairo contracts in `dare-board/contracts/`
- old backend code in `dare-board/legacy/backend/`

## Commands

```bash
cd dare-board
npm install
npm run dev
npm run typecheck
npm run build
```

## Environment

Create `dare-board/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_RPC_URL=https://starknet-sepolia-rpc.publicnode.com
NEXT_PUBLIC_STARKSCAN_URL=https://sepolia.starkscan.co
DEPLOYER_ACCOUNT_ADDRESS=
DEPLOYER_PRIVATE_KEY=
CRON_SECRET=
```

## Structure

```text
dare-board/
├── src/
├── contracts/
├── legacy/backend/
├── deploy.sh
├── package.json
└── next.config.mjs
```
