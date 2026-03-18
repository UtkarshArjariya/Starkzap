import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet } from "jose";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const PRIVY_JWKS_URL = `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`;

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

    const privy = await getPrivyClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (privy as any).wallets().rawSign(walletId, { hash });

    return NextResponse.json({
      signature: response.data?.signature ?? response.signature ?? response,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signing failed";
    console.error("[/api/wallet/sign]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
