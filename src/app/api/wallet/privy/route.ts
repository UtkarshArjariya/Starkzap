import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet } from "jose";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const PRIVY_JWKS_URL = `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`;

// Cache the JWKS keyset
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(PRIVY_JWKS_URL));
  }
  return jwks;
}

async function getPrivyClient() {
  const { PrivyClient } = await import("@privy-io/node");
  return new PrivyClient({
    appId: PRIVY_APP_ID,
    appSecret: process.env.PRIVY_APP_SECRET!,
  });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify the access token using Privy's JWKS endpoint
    const { verifyAccessToken } = await import("@privy-io/node");
    const verified = await verifyAccessToken({
      access_token: token,
      app_id: PRIVY_APP_ID,
      verification_key: getJWKS(),
    });

    let userId = verified.user_id;
    if (!userId.startsWith("did:privy:")) {
      userId = `did:privy:${userId}`;
    }

    const privy = await getPrivyClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = privy as any;

    // Get user to find existing starknet wallet
    const user = await p.users().get(userId);
    const starkWallet = user.linked_accounts?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) =>
        a.chain_type === "starknet" ||
        (a.type === "wallet" && a.chain_type === "starknet"),
    );

    if (starkWallet?.id && starkWallet?.public_key) {
      return NextResponse.json({
        walletId: starkWallet.id,
        publicKey: starkWallet.public_key,
      });
    }

    // Create a new Starknet wallet for this user
    const created = await p.wallets().create({
      chainType: "starknet",
      userId,
    });

    return NextResponse.json({
      walletId: created.id,
      publicKey: created.public_key,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to resolve wallet";
    console.error("[/api/wallet/privy]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
