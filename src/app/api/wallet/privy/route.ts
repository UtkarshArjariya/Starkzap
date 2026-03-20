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
  const authKeyId = process.env.PRIVY_AUTHORIZATION_KEY_ID;
  if (!appId || !appSecret || !authKeyId) {
    throw new Error("Missing PRIVY env vars");
  }
  return { appId, appSecret, authKeyId };
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
    const { appId, appSecret, authKeyId } = getEnv();
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

    // Find existing starknet wallet that has the authorization key as signer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const starkWallets = (user.linked_accounts ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.type === "wallet" && a.chain_type === "starknet",
    );

    // Prefer a wallet that already has our authorization key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const sw of starkWallets) {
      if (sw.id && sw.public_key) {
        // Check if it has our auth key (fetch full wallet details)
        const wResp = await fetch(
          `${PRIVY_API_BASE}/wallets/${encodeURIComponent(sw.id)}`,
          { headers },
        );
        if (wResp.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wData: any = await wResp.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hasAuthKey = wData.additional_signers?.some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (s: any) => s.signer_id === authKeyId,
          );
          if (hasAuthKey) {
            return NextResponse.json({
              walletId: sw.id,
              publicKey: sw.public_key ?? wData.public_key,
            });
          }
        }
      }
    }

    // No wallet with auth key found — create a new one
    const createResp = await fetch(`${PRIVY_API_BASE}/wallets`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        chain_type: "starknet",
        owner: { user_id: userId },
        additional_signers: [{ signer_id: authKeyId }],
      }),
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
