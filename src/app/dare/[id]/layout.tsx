import type { Metadata } from "next";
import { getDare } from "@/lib/contract";
import { formatAmount, getTokenDecimals, getTokenSymbol } from "@/lib/config";
import { stripTags } from "@/lib/categories";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const dare = await getDare(BigInt(id));
    const symbol = getTokenSymbol(dare.rewardToken);
    const amount = formatAmount(dare.rewardAmount, getTokenDecimals(dare.rewardToken));
    const cleanDesc = stripTags(dare.description) || `A ${amount} ${symbol} dare on Starknet.`;
    const title = dare.title || "Untitled Dare";
    const ogImageUrl = `/api/og/${id}`;

    return {
      title,
      description: cleanDesc.slice(0, 160),
      openGraph: {
        title: `${title} — ${amount} ${symbol}`,
        description: cleanDesc.slice(0, 160),
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} — ${amount} ${symbol}`,
        description: cleanDesc.slice(0, 160),
        images: [ogImageUrl],
      },
    };
  } catch {
    return {
      title: "Dare Not Found",
      description: "This dare may no longer exist.",
    };
  }
}

export default function DareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
