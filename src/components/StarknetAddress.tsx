"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useStarknetName } from "@/hooks/useStarknetId";

export default function StarknetAddress({
  address,
  className = "",
}: {
  address: string;
  className?: string;
}) {
  const name = useStarknetName(address);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      className={`inline-flex items-center gap-1.5 font-mono text-sm text-slate-200 transition hover:text-white ${className}`}
      title={address}
      onClick={handleCopy}
    >
      {name}
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 text-slate-500" />
      )}
    </button>
  );
}
