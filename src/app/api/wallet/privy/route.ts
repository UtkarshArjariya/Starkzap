import { NextRequest, NextResponse } from "next/server";

// Dynamic import to work around TypeScript dual-API issues in @privy-io/node
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
    // Decode JWT to get userId (Privy-issued, trusted behind our auth)
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );
    let userId = payload.sub as string;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    // Ensure did:privy: prefix
    if (!userId.startsWith("did:privy:")) {
      userId = `did:privy:${userId}`;
    }

    const privy = await getPrivyClient();

    // Get user to find existing starknet wallet
    // Runtime API: privy.users() returns service, .get() fetches user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = privy as any;
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
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[/api/wallet/privy]", message, stack);
    // Return detailed error in development, generic in production
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
