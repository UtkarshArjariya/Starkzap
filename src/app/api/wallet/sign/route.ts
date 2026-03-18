import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet } from "jose";

const PRIVY_API_BASE = "https://api.privy.io/v1";

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

    // Verify token via JWKS
    const { verifyAccessToken } = await import("@privy-io/node");
    await verifyAccessToken({
      access_token: token,
      app_id: appId,
      verification_key: getJWKS(appId),
    });

    const { walletId, hash } = await req.json();
    if (!walletId || !hash) {
      return NextResponse.json(
        { error: "Missing walletId or hash" },
        { status: 400 },
      );
    }

    // Sign via REST API
    const signResp = await fetch(
      `${PRIVY_API_BASE}/wallets/${encodeURIComponent(walletId)}/raw_sign`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ hash }),
      },
    );
    if (!signResp.ok) {
      const errBody = await signResp.text();
      throw new Error(`Privy signing failed: ${signResp.status} ${errBody}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await signResp.json();

    return NextResponse.json({
      signature: response.data?.signature ?? response.signature ?? response,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signing failed";
    console.error("[/api/wallet/sign]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
