"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { formatAmount, getTokenSymbol } from "@/lib/config";
import type { Dare } from "@/lib/types";

export default function ShareButton({ dare }: { dare: Dare }) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/dare/${dare.id.toString()}`
      : `/dare/${dare.id.toString()}`;

  const tokenSymbol = getTokenSymbol(dare.rewardToken);
  const amount = formatAmount(dare.rewardAmount);
  const tweetText = `🎯 Dare: "${dare.title}" — ${amount} ${tokenSymbol} up for grabs on Starknet. Can you do it?`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}&hashtags=DareBoard,Starknet`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:border-cyan-300/20 hover:text-white"
        title={copied ? "Copied!" : "Copy link"}
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied!" : "Copy link"}
      </button>

      <a
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:border-cyan-300/20 hover:text-white"
        href={tweetUrl}
        rel="noopener noreferrer"
        target="_blank"
        onClick={(e) => e.stopPropagation()}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share on X
      </a>
    </div>
  );
}
