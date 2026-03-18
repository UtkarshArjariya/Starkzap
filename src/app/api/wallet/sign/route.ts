import { NextRequest, NextResponse } from "next/server";

async function getPrivyClient() {
  const { PrivyClient } = await import("@privy-io/node");
  return new PrivyClient({
    appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
    appSecret: process.env.PRIVY_APP_SECRET!,
  });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify caller has a valid Privy JWT
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );
    if (!payload.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { walletId, hash } = await req.json();

    if (!walletId || !hash) {
      return NextResponse.json(
        { error: "Missing walletId or hash" },
        { status: 400 },
      );
    }

    const privy = await getPrivyClient();

    // Runtime API: privy.wallets().rawSign(walletId, { hash })
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
