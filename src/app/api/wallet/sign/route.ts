import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet } from "jose";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET!;
const PRIVY_JWKS_URL = `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`;
const PRIVY_API_BASE = "https://api.privy.io/v1";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(PRIVY_JWKS_URL));
  }
  return jwks;
}

function privyHeaders() {
  return {
    "privy-app-id": PRIVY_APP_ID,
    Authorization:
      "Basic " +
      Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString("base64"),
    "Content-Type": "application/json",
  };
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify token via JWKS
    const { verifyAccessToken } = await import("@privy-io/node");
    await verifyAccessToken({
      access_token: token,
      app_id: PRIVY_APP_ID,
      verification_key: getJWKS(),
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
        headers: privyHeaders(),
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
