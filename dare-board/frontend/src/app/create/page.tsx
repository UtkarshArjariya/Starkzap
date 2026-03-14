"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Lock } from "lucide-react";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWallet } from "@/context/WalletContext";
import { STARKSCAN_URL, getTokenSymbol } from "@/lib/config";
import { TOKENS, createDare } from "@/lib/contract";

function getMinDateTime(): string {
  const date = new Date(Date.now() + 3600 * 1000 + 5 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

export default function CreatePage() {
  const router = useRouter();
  const { wallet, connect } = useWallet();
  const [form, setForm] = useState<{
    title: string;
    description: string;
    rewardToken: string;
    rewardAmount: string;
    deadline: string;
  }>({
    title: "",
    description: "",
    rewardToken: TOKENS.STRK,
    rewardAmount: "",
    deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const tokenSymbol = useMemo(() => getTokenSymbol(form.rewardToken), [form.rewardToken]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    if (form.title.trim().length > 31) {
      setError("Title must fit into the Cairo felt252 limit of 31 ASCII characters");
      return;
    }

    if (!form.rewardAmount || Number(form.rewardAmount) <= 0) {
      setError("Reward amount must be greater than 0");
      return;
    }

    if (!form.deadline) {
      setError("Deadline is required");
      return;
    }

    const deadline = new Date(form.deadline);
    if (deadline.getTime() < Date.now() + 3600_000) {
      setError("Deadline must be at least one hour from now");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const activeWallet = wallet ?? (await connect());
      const hash = await createDare(activeWallet, {
        title: form.title.trim(),
        description: form.description.trim(),
        rewardToken: form.rewardToken,
        rewardAmount: form.rewardAmount,
        deadline,
      });
      setTxHash(hash);
      window.setTimeout(() => router.push("/"), 2600);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white" href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="surface-panel px-6 py-6">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">New dare</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Lock a reward and challenge the crowd.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Titles become on-chain felt values, so keep them short. Descriptions, deadlines, and the escrowed reward stay visible to everyone reviewing the claim later.
            </p>

            {txHash ? (
              <div className="mt-8 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-200" />
                <p className="mt-3 text-lg font-semibold text-white">Dare posted successfully</p>
                <p className="mt-2 text-sm text-emerald-50/80">The reward is now locked in escrow. Redirecting to the board...</p>
                <a
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-cyan-200 transition hover:text-white"
                  href={`${STARKSCAN_URL}/tx/${txHash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  View transaction
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Title</label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/30"
                    maxLength={31}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="Do 100 push-ups live"
                    type="text"
                    value={form.title}
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>Stored on-chain as felt252</span>
                    <span>{form.title.length}/31</span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Description</label>
                  <textarea
                    className="min-h-36 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/30"
                    maxLength={500}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Describe exactly what the claimer must do, what counts as valid proof, and how the community should judge it."
                    value={form.description}
                  />
                  <p className="mt-2 text-right text-xs text-slate-500">{form.description.length}/500</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Reward token</label>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/30"
                      onChange={(event) => updateField("rewardToken", event.target.value)}
                      value={form.rewardToken}
                    >
                      <option value={TOKENS.STRK}>STRK</option>
                      <option value={TOKENS.ETH}>ETH</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Reward amount</label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/30"
                      min="0.000001"
                      onChange={(event) => updateField("rewardAmount", event.target.value)}
                      placeholder="25"
                      step="0.01"
                      type="number"
                      value={form.rewardAmount}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Deadline</label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/30"
                    min={getMinDateTime()}
                    onChange={(event) => updateField("deadline", event.target.value)}
                    type="datetime-local"
                    value={form.deadline}
                  />
                  <p className="mt-2 text-xs text-slate-500">Minimum one hour from now to avoid accidental instant expiry.</p>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div>
                ) : null}

                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                  disabled={loading || !form.title || !form.rewardAmount || !form.deadline}
                  onClick={() => void handleSubmit()}
                >
                  {loading ? <LoadingSpinner size="sm" /> : <Lock className="h-4 w-4" />}
                  {loading ? "Sending transaction..." : `Post dare and lock ${form.rewardAmount || "0"} ${tokenSymbol}`}
                </button>
              </div>
            )}
          </section>

          <aside className="surface-panel px-6 py-6">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">What happens next</p>
            <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
              <li>
                <span className="font-semibold text-white">1.</span> Your wallet approves the selected token and creates the dare in one multicall.
              </li>
              <li>
                <span className="font-semibold text-white">2.</span> Someone claims it, submits proof, and moves the challenge into voting.
              </li>
              <li>
                <span className="font-semibold text-white">3.</span> Anyone except the poster and claimer can vote to approve or reject the proof.
              </li>
              <li>
                <span className="font-semibold text-white">4.</span> Once the deadline or vote window ends, `finalize_dare` distributes the reward based on the contract rules.
              </li>
            </ol>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Preview</p>
              <p className="mt-3 text-xl font-semibold text-white">{form.title || "Your dare title"}</p>
              <p className="mt-2 line-clamp-3 text-sm text-slate-400">
                {form.description || "A concise description helps the community judge proof later."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-fuchsia-300/15 bg-fuchsia-300/10 px-3 py-1 text-xs text-fuchsia-100">
                  {form.rewardAmount || "0"} {tokenSymbol}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {form.deadline ? new Date(form.deadline).toLocaleString() : "Deadline not set"}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
