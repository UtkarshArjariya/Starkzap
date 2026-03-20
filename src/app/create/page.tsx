"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Lock, Tag } from "lucide-react";
import AdaptiveHeader from "@/components/AdaptiveHeader";
import { ModernCreatePage } from "@/components/new-look/create-page";
import { useUI } from "@/context/UIContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/context/ToastContext";
import { STARKSCAN_URL, getTokenDecimals, getTokenSymbol } from "@/lib/config";
import { TOKENS, createDare, getTokenBalance } from "@/lib/contract";
import { CATEGORIES, appendTags } from "@/lib/categories";
import { DARE_TEMPLATES } from "@/lib/dareTemplates";
import { decodeContractError } from "@/lib/utils";

function getMinDateTime(): string {
  const date = new Date(Date.now() + 3600 * 1000 + 5 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

export default function CreatePage() {
  const { mode } = useUI();
  if (mode === "modern") return <ModernCreatePage />;

  return <ClassicCreatePage />;
}

function ClassicCreatePage() {
  const router = useRouter();
  const { wallet, connect } = useWallet();
  const toast = useToast();
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const tokenSymbol = useMemo(
    () => getTokenSymbol(form.rewardToken),
    [form.rewardToken],
  );

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyTemplate = (tpl: (typeof DARE_TEMPLATES)[number]) => {
    const deadlineDate = new Date(Date.now() + tpl.suggestedDays * 86400_000);
    setForm({
      title: tpl.title,
      description: tpl.description,
      rewardToken: TOKENS.STRK,
      rewardAmount: tpl.suggestedRewardStrk,
      deadline: deadlineDate.toISOString().slice(0, 16),
    });
    setSelectedTags([tpl.category]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 3
          ? [...prev, tag]
          : prev,
    );
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    if (form.title.trim().length > 31) {
      setError(
        "Title must fit into the Cairo felt252 limit of 31 ASCII characters",
      );
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

      // Check token balance before submitting
      const decimals = getTokenDecimals(form.rewardToken);
      const requiredAmount = BigInt(
        Math.floor(Number(form.rewardAmount) * 10 ** decimals),
      );
      try {
        const balance = await getTokenBalance(
          form.rewardToken,
          activeWallet.address,
        );
        if (balance < requiredAmount) {
          const symbol = getTokenSymbol(form.rewardToken);
          setError(
            `Insufficient ${symbol} balance. Your wallet needs ${form.rewardAmount} ${symbol} to lock as reward. ` +
              `Go to your profile to copy your wallet address and send tokens to it.`,
          );
          toast.error(
            `Insufficient ${symbol} balance — fund your wallet first.`,
          );
          setLoading(false);
          return;
        }
      } catch {
        // If balance check fails, let the transaction attempt proceed
      }

      const finalDescription = appendTags(
        form.description.trim(),
        selectedTags,
      );
      const hash = await createDare(activeWallet, {
        title: form.title.trim(),
        description: finalDescription,
        rewardToken: form.rewardToken,
        rewardAmount: form.rewardAmount,
        deadline,
      });
      setTxHash(hash);
      toast.success("Dare posted!", { txHash: hash });
      window.setTimeout(() => router.push("/"), 2600);
    } catch (submitError) {
      const msg = decodeContractError(submitError);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AdaptiveHeader />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        {/* Templates */}
        <div className="mt-6 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
          {DARE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.title}
              className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center transition hover:border-fuchsia-300/20 hover:bg-white/[0.08] sm:w-auto w-32"
              onClick={() => applyTemplate(tpl)}
            >
              <span className="text-2xl">{tpl.emoji}</span>
              <span className="text-xs font-medium text-slate-200 line-clamp-2">
                {tpl.title}
              </span>
              <span className="text-[10px] text-slate-500">
                {tpl.suggestedRewardStrk} STRK
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="surface-panel px-6 py-6">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
              New dare
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Lock a reward and challenge the crowd.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Titles become on-chain felt values, so keep them short.
              Descriptions, deadlines, and the escrowed reward stay visible to
              everyone reviewing the claim later.
            </p>

            {txHash ? (
              <div className="mt-8 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-200" />
                <p className="mt-3 text-lg font-semibold text-white">
                  Dare posted successfully
                </p>
                <p className="mt-2 text-sm text-emerald-50/80">
                  The reward is now locked in escrow. Redirecting to the
                  board...
                </p>
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
                  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                    Title
                  </label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/30"
                    maxLength={31}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
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
                  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                    Description
                  </label>
                  <textarea
                    className="min-h-36 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/30"
                    maxLength={500}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    placeholder="Describe exactly what the claimer must do, what counts as valid proof, and how the community should judge it."
                    value={form.description}
                  />
                  <p className="mt-2 text-right text-xs text-slate-500">
                    {form.description.length}/500
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                      Reward token
                    </label>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/30"
                      onChange={(event) =>
                        updateField("rewardToken", event.target.value)
                      }
                      value={form.rewardToken}
                    >
                      <option value={TOKENS.STRK}>STRK</option>
                      <option value={TOKENS.ETH}>ETH</option>
                      {TOKENS.USDC ? (
                        <option value={TOKENS.USDC}>USDC</option>
                      ) : null}
                      {TOKENS.USDT ? (
                        <option value={TOKENS.USDT}>USDT</option>
                      ) : null}
                      {TOKENS.WBTC ? (
                        <option value={TOKENS.WBTC}>WBTC</option>
                      ) : null}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                      Reward amount
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/30"
                      min="0.000001"
                      onChange={(event) =>
                        updateField("rewardAmount", event.target.value)
                      }
                      placeholder="25"
                      step="0.01"
                      type="number"
                      value={form.rewardAmount}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      A 1% platform fee is deducted on creation. Another 1% is
                      deducted from the reward when the dare is approved.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                    Deadline
                  </label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/30"
                    min={getMinDateTime()}
                    onChange={(event) =>
                      updateField("deadline", event.target.value)
                    }
                    type="datetime-local"
                    value={form.deadline}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Minimum one hour from now to avoid accidental instant
                    expiry.
                  </p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <Tag className="h-3 w-3" />
                    Categories (optional, max 3)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        className={
                          selectedTags.includes(cat.name)
                            ? "rounded-full bg-fuchsia-500/20 border border-fuchsia-300/30 px-3 py-1.5 text-xs font-medium text-fuchsia-100 transition"
                            : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
                        }
                        onClick={() => toggleTag(cat.name)}
                      >
                        {cat.emoji} {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                  disabled={
                    loading ||
                    !form.title ||
                    !form.rewardAmount ||
                    !form.deadline
                  }
                  onClick={() => void handleSubmit()}
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {loading
                    ? "Sending transaction..."
                    : `Post dare and lock ${form.rewardAmount || "0"} ${tokenSymbol}`}
                </button>
              </div>
            )}
          </section>

          <aside className="surface-panel px-6 py-6">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              What happens next
            </p>
            <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
              <li>
                <span className="font-semibold text-white">1.</span> Your wallet
                approves the selected token and creates the dare in one
                multicall.
              </li>
              <li>
                <span className="font-semibold text-white">2.</span> Someone
                claims it, submits proof, and moves the challenge into voting.
              </li>
              <li>
                <span className="font-semibold text-white">3.</span> Anyone
                except the poster and claimer can vote to approve or reject the
                proof.
              </li>
              <li>
                <span className="font-semibold text-white">4.</span> Once the
                deadline or vote window ends, `finalize_dare` distributes the
                reward based on the contract rules.
              </li>
            </ol>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Preview
              </p>
              <p className="mt-3 text-xl font-semibold text-white">
                {form.title || "Your dare title"}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-slate-400">
                {form.description ||
                  "A concise description helps the community judge proof later."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-fuchsia-300/15 bg-fuchsia-300/10 px-3 py-1 text-xs text-fuchsia-100">
                  {form.rewardAmount || "0"} {tokenSymbol}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {form.deadline
                    ? new Date(form.deadline).toLocaleString()
                    : "Deadline not set"}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
