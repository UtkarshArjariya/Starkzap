"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  Tag,
  Zap,
} from "lucide-react";
import { ModernHeader } from "./header";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/context/ToastContext";
import { TOKENS, createDare, getTokenBalance } from "@/lib/contract";
import { CATEGORIES, appendTags } from "@/lib/categories";
import { DARE_TEMPLATES } from "@/lib/dareTemplates";
import {
  VOYAGER_URL,
  getTokenDecimals,
  getTokenSymbol,
} from "@/lib/config";
import { decodeContractError } from "@/lib/utils";

function getMinDateTime(): string {
  const date = new Date(Date.now() + 3600 * 1000 + 5 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

const DEADLINE_PRESETS = [
  { label: "24 h", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
  { label: "2 weeks", hours: 336 },
];

/* ── tiny live-preview card ─────────────────────────────────────────── */
function PreviewCard({
  title,
  description,
  reward,
  token,
  tags,
}: {
  title: string;
  description: string;
  reward: string;
  token: string;
  tags: string[];
}) {
  const rewardNum = parseFloat(reward) || 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="rounded-full border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/15 px-2.5 py-1 text-xs font-medium text-[hsl(var(--success))]">
          Open
        </span>
        <div className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1">
          <Zap className="h-3.5 w-3.5 text-accent" />
          <span className="text-sm font-bold text-accent">
            {rewardNum > 0 ? rewardNum.toLocaleString() : "—"} {token}
          </span>
        </div>
      </div>

      <h3 className="mb-1.5 line-clamp-2 font-semibold text-foreground">
        {title || "Your dare title…"}
      </h3>
      <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
        {description || "Describe what the challenger needs to do…"}
      </p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────────── */
export function ModernCreatePage() {
  const router = useRouter();
  const { wallet, connect } = useWallet();
  const toast = useToast();

  const [form, setForm] = useState({
    title: "",
    description: "",
    rewardToken: TOKENS.STRK,
    rewardAmount: "",
    deadline: "",
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [deadlinePreset, setDeadlinePreset] = useState<number | null>(null);
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
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const applyTemplate = (tpl: (typeof DARE_TEMPLATES)[number]) => {
    const deadlineDate = new Date(Date.now() + tpl.suggestedDays * 86_400_000);
    setForm({
      title: tpl.title,
      description: tpl.description,
      rewardToken: TOKENS.STRK,
      rewardAmount: tpl.suggestedRewardStrk,
      deadline: deadlineDate.toISOString().slice(0, 16),
    });
    setSelectedTags([tpl.category]);
    setDeadlinePreset(null);
  };

  const applyDeadlinePreset = (hours: number) => {
    const date = new Date(Date.now() + hours * 3_600_000);
    setDeadlinePreset(hours);
    updateField("deadline", date.toISOString().slice(0, 16));
  };

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 3
          ? [...prev, tag]
          : prev,
    );

  /* fee breakdown */
  const rewardNum = parseFloat(form.rewardAmount) || 0;
  const platformFee = rewardNum * 0.01;
  const claimerFee = rewardNum * 0.01;
  const winnerReceives = rewardNum - platformFee - claimerFee;

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (form.title.trim().length > 31) {
      setError("Title must be 31 characters or less (Cairo felt252 limit)");
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
    if (deadline.getTime() < Date.now() + 3_600_000) {
      setError("Deadline must be at least one hour from now");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const activeWallet = wallet ?? (await connect());
      if (!activeWallet) { setLoading(false); return; }

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
          const msg = `Insufficient ${symbol} balance — fund your wallet first.`;
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }
      } catch {
        // balance check failed — let the tx proceed
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

  /* ── success screen ────────────────────────────────────────────────── */
  if (txHash) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <ModernHeader />
        <main className="mx-auto max-w-lg px-4 py-24 text-center lg:px-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[hsl(var(--success))]/20">
            <Check className="h-10 w-10 text-[hsl(var(--success))]" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-foreground">
            Dare posted!
          </h1>
          <p className="mb-8 text-muted-foreground">
            Your dare is live on-chain. Redirecting to the feed…
          </p>
          <a
            href={`${VOYAGER_URL}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            <ExternalLink className="h-4 w-4" />
            View transaction
          </a>
        </main>
      </div>
    );
  }

  /* ── form ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <ModernHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Feed
        </Link>

        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">
            Create a Dare
          </h1>
          <p className="text-muted-foreground">
            Challenge the community and stake crypto as a bounty
          </p>
        </div>

        {/* Template picker */}
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Start with a template
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {DARE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.title}
                onClick={() => applyTemplate(tpl)}
                className="flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center transition-all hover:border-primary/50 hover:bg-secondary"
              >
                <span className="mb-2 text-3xl">{tpl.emoji}</span>
                <span className="line-clamp-2 text-xs font-medium text-foreground">
                  {tpl.title}
                </span>
                <span className="mt-1 text-[10px] text-muted-foreground">
                  {tpl.suggestedRewardStrk} STRK
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* ── Left: form ────────────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-3">
            {/* Error banner */}
            {error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Dare Title{" "}
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g., Run a marathon in under 4 hours"
                maxLength={31}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p
                className={`mt-1 text-right text-xs ${form.title.length > 27 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {form.title.length}/31
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the challenge in detail. What exactly needs to be done? What proof is required?"
                maxLength={500}
                className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {form.description.length}/500
              </p>
            </div>

            {/* Reward */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Bounty Amount <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={form.rewardAmount}
                  onChange={(e) => updateField("rewardAmount", e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={form.rewardToken}
                  onChange={(e) => updateField("rewardToken", e.target.value)}
                  className="shrink-0 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
                >
                  <option value={TOKENS.STRK}>STRK</option>
                  <option value={TOKENS.ETH}>ETH</option>
                </select>
              </div>
            </div>

            {/* Fee breakdown */}
            {rewardNum > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Info className="h-4 w-4" />
                  Fee Breakdown
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">You stake</span>
                    <span className="font-medium text-foreground">
                      {rewardNum} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Platform fee (1%)
                    </span>
                    <span className="text-muted-foreground">
                      -{platformFee.toFixed(4)} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Claimer fee (1%)
                    </span>
                    <span className="text-muted-foreground">
                      -{claimerFee.toFixed(4)} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-medium text-foreground">
                      Winner receives
                    </span>
                    <span className="font-bold text-[hsl(var(--success))]">
                      {winnerReceives.toFixed(4)} {tokenSymbol}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Deadline */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Deadline <span className="text-destructive">*</span>
              </label>
              <div className="mb-3 flex flex-wrap gap-2">
                {DEADLINE_PRESETS.map((p) => (
                  <button
                    key={p.hours}
                    type="button"
                    onClick={() => applyDeadlinePreset(p.hours)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      deadlinePreset === p.hours
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => {
                  updateField("deadline", e.target.value);
                  setDeadlinePreset(null);
                }}
                min={getMinDateTime()}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Categories
                  <span className="text-xs font-normal text-muted-foreground">
                    (up to 3)
                  </span>
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => toggleTag(cat.name)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedTags.includes(cat.name)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {cat.emoji} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleSubmit()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Posting Dare…
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Post Dare
                  {rewardNum > 0 ? ` — ${rewardNum} ${tokenSymbol}` : ""}
                </>
              )}
            </button>
          </div>

          {/* ── Right: live preview ───────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Live Preview
                </p>
                <PreviewCard
                  title={form.title}
                  description={form.description}
                  reward={form.rewardAmount}
                  token={tokenSymbol}
                  tags={selectedTags}
                />
              </div>

              {/* How it works */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  What Happens Next
                </p>
                <div className="space-y-3">
                  {[
                    "Your dare goes live on the feed",
                    "Someone claims it and starts working",
                    "They submit proof (video / photo)",
                    "Community votes on the proof",
                    "Winner gets paid automatically on-chain",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                        {i + 1}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
