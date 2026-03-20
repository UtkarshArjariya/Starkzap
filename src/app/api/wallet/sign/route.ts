import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet } from "jose";

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
  const authKey = process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY;
  if (!appId || !appSecret || !authKey) {
    throw new Error("Missing PRIVY env vars");
  }
  return { appId, appSecret, authKey };
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { appId, appSecret, authKey } = getEnv();

    // Verify token via JWKS (ensures caller is authenticated)
    const { verifyAccessToken, PrivyClient } = await import("@privy-io/node");
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

    // Sign via SDK with authorization private key for user-owned wallets
    const privy = new PrivyClient({ appId, appSecret });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await privy.wallets().rawSign(walletId, {
      params: { hash },
      authorization_context: {
        authorization_private_keys: [authKey],
      },
    });

    const signature =
      response?.data?.signature ?? response?.signature ?? response;

    return NextResponse.json({ signature });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signing failed";
    console.error("[/api/wallet/sign]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
