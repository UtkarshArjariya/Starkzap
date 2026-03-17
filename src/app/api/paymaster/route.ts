import { NextResponse } from "next/server";

const PAYMASTER_URLS: Record<string, string> = {
  mainnet: "https://starknet.paymaster.avnu.fi",
  sepolia: "https://sepolia.paymaster.avnu.fi",
};

const network = process.env.NEXT_PUBLIC_STARKNET_NETWORK ?? "sepolia";
const PAYMASTER_URL = PAYMASTER_URLS[network] ?? PAYMASTER_URLS.sepolia;

export async function POST(request: Request) {
  const apiKey = process.env.AVNU_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Paymaster API key not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(PAYMASTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paymaster-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Paymaster proxy error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
