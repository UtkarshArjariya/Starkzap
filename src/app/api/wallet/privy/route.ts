import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet } from "jose";

const PRIVY_API_BASE = "https://api.privy.io/v1";

// Cache the JWKS keyset per appId
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksAppId: string | null = null;
function getJWKS(appId: string) {
  if (!jwks || jwksAppId !== appId) {
    jwksAppId = appId;
    jwks = createRemoteJWKSet(
      new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`),
    );
  }
  return jwks;
}

function getEnv() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Missing PRIVY env vars");
  }
  return { appId, appSecret };
}

function privyHeaders(appId: string, appSecret: string) {
  return {
    "privy-app-id": appId,
    Authorization:
      "Basic " +
      Buffer.from(`${appId}:${appSecret}`).toString("base64"),
    "Content-Type": "application/json",
  };
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { appId, appSecret } = getEnv();
    const headers = privyHeaders(appId, appSecret);

    // Verify the access token using Privy's JWKS endpoint
    const { verifyAccessToken } = await import("@privy-io/node");
    const verified = await verifyAccessToken({
      access_token: token,
      app_id: appId,
      verification_key: getJWKS(appId),
    });

    let userId = verified.user_id;
    if (!userId.startsWith("did:privy:")) {
      userId = `did:privy:${userId}`;
    }

    // Get user via REST API to find existing starknet wallet
    const userResp = await fetch(
      `${PRIVY_API_BASE}/users/${encodeURIComponent(userId)}`,
      { headers },
    );
    if (!userResp.ok) {
      const body = await userResp.text();
      throw new Error(`Privy user lookup failed: ${userResp.status} ${body}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await userResp.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const starkWallet = user.linked_accounts?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.type === "wallet" && a.chain_type === "starknet",
    );

    if (starkWallet?.id && starkWallet?.public_key) {
      return NextResponse.json({
        walletId: starkWallet.id,
        publicKey: starkWallet.public_key,
      });
    }

    // Create a new Starknet wallet via REST API
    const createResp = await fetch(`${PRIVY_API_BASE}/wallets`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        chain_type: "starknet",
        owner: { user_id: userId },
      }),
    });
    if (!createResp.ok) {
      const errBody = await createResp.text();
      throw new Error(`Privy wallet creation failed: ${createResp.status} ${errBody}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created: any = await createResp.json();

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
