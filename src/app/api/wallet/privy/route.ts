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

/**
 * Find an existing app-owned starknet wallet for this user by listing all
 * starknet wallets and checking a client-provided hint, or create a new one.
 *
 * We create wallets WITHOUT an owner so the server can sign freely (app-owned).
 * The client caches walletId in localStorage and sends it back as a hint.
 */
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
    await verifyAccessToken({
      access_token: token,
      app_id: appId,
      verification_key: getJWKS(appId),
    });

    // Check if client sent a cached walletId hint
    let body: { walletId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine
    }

    if (body.walletId) {
      // Verify the wallet exists and is a starknet wallet
      const checkResp = await fetch(
        `${PRIVY_API_BASE}/wallets/${encodeURIComponent(body.walletId)}`,
        { headers },
      );
      if (checkResp.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wallet: any = await checkResp.json();
        if (wallet.chain_type === "starknet" && wallet.public_key) {
          return NextResponse.json({
            walletId: wallet.id,
            publicKey: wallet.public_key,
          });
        }
      }
    }

    // Create a new app-owned Starknet wallet (no owner = server can sign)
    const createResp = await fetch(`${PRIVY_API_BASE}/wallets`, {
      method: "POST",
      headers,
      body: JSON.stringify({ chain_type: "starknet" }),
    });
    if (!createResp.ok) {
      const errBody = await createResp.text();
      throw new Error(
        `Privy wallet creation failed: ${createResp.status} ${errBody}`,
      );
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
