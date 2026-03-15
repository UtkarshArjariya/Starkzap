"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import DareForm from "@/components/DareForm";
import {
  createDare,
  getDareCount,
  getExplorerTransactionUrl,
  isContractConfigured
} from "@/lib/contract";
import type { CreateDareParams } from "@/lib/types";
import { useContractAction } from "@/hooks/useContract";

export default function CreatePage() {
  const router = useRouter();
  const { withWallet, isPending, error } = useContractAction();
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleSubmit(values: CreateDareParams) {
    const tx = await withWallet((wallet) => createDare(wallet, values));
    setTxHash(tx.transaction_hash);
    const latestId = await getDareCount();
    router.push(`/dare/${latestId.toString()}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <section className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-accent-soft">
          Create a new dare
        </p>
        <h1 className="text-4xl font-semibold text-white">Lock the reward up front.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
          Posting a dare bundles ERC20 approval with the contract call in one sponsored
          Starkzap transaction.
        </p>

        {!isContractConfigured() ? (
          <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            The contract address is not configured yet. Deploy the Cairo contract first and
            set <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code>.
          </div>
        ) : null}

        <div className="mt-8">
          <DareForm isPending={isPending} error={error} onSubmit={handleSubmit} />
        </div>

        {txHash ? (
          <a
            href={getExplorerTransactionUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200"
          >
            View submitted transaction
          </a>
        ) : null}
      </section>
    </main>
  );
}
