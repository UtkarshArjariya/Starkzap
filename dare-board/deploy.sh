#!/bin/bash
# ============================================================
#  Dare Board — Contract Deploy + Next.js Bootstrap
#  Run this from your local machine with Starknet Sepolia access
#
#  Usage:
#    chmod +x deploy.sh
#    DEPLOYER_PRIVATE_KEY=0x... ./deploy.sh
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACTS_DIR="$PROJECT_DIR/contracts"
FRONTEND_DIR="$PROJECT_DIR/frontend"
SCRIPTS_DIR="$CONTRACTS_DIR/scripts"

echo ""
echo "=================================================="
echo "  Dare Board — Contract Deploy + Next.js Start"
echo "=================================================="
echo ""

# ── Step 0: Validate required env ─────────────────────────
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "ERROR: DEPLOYER_PRIVATE_KEY is required"
  exit 1
fi

# ── Step 1: Build Cairo contract ──────────────────────────
echo "📦 Building Cairo contract..."
cd "$CONTRACTS_DIR"
~/.local/bin/scarb build || { echo "ERROR: scarb build failed"; exit 1; }
echo "✅ Contract compiled"

# ── Step 2: Install deploy script deps ───────────────────
echo ""
echo "📦 Installing deploy script deps..."
cd "$SCRIPTS_DIR"
npm install --silent 2>/dev/null || yarn install --silent 2>/dev/null
echo "✅ Deploy deps ready"

# ── Step 3: Deploy contract ───────────────────────────────
echo ""
echo "🚀 Deploying to Starknet Sepolia..."
cd "$SCRIPTS_DIR"
DEPLOYER_PRIVATE_KEY="${DEPLOYER_PRIVATE_KEY}" npx ts-node --project tsconfig.json deploy.ts

# ── Step 4: Install frontend deps ─────────────────────────
echo ""
echo "📦 Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install

# ── Step 5: Start frontend ────────────────────────────────
echo ""
echo "🌐 Starting Next.js app..."
npm run dev
