"use client";

import { useMemo, useState } from "react";

import { getSupportedTokens } from "@/lib/contract";
import type { CreateDareParams } from "@/lib/types";

type DareFormState = {
  title: string;
  description: string;
  rewardToken: string;
  rewardAmount: string;
  deadline: string;
};

type DareFormProps = {
  isPending: boolean;
  error: string | null;
  onSubmit: (values: CreateDareParams) => Promise<void>;
};

export default function DareForm({ isPending, error, onSubmit }: DareFormProps) {
  const tokens = useMemo(() => getSupportedTokens(), []);

  // datetime-local expects LOCAL time (not UTC), so we format manually.
  // Default to 2 hours from now (contract requires minimum 1 hour lead time).
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const minDeadline = `${twoHoursFromNow.getFullYear()}-${pad(twoHoursFromNow.getMonth() + 1)}-${pad(twoHoursFromNow.getDate())}T${pad(twoHoursFromNow.getHours())}:${pad(twoHoursFromNow.getMinutes())}`;

  const [form, setForm] = useState<DareFormState>({
    title: "",
    description: "",
    rewardToken: tokens[0].address,
    rewardAmount: "",
    deadline: minDeadline
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          title: form.title.trim(),
          description: form.description.trim(),
          rewardToken: form.rewardToken,
          rewardAmount: form.rewardAmount,
          deadline: new Date(form.deadline)
        });
      }}
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-white/80">Dare title</label>
        <input
          required
          maxLength={31}
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-accent/40"
          placeholder="Eat a lemon without making a face"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white/80">Description</label>
        <textarea
          required
          rows={5}
          maxLength={500}
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
          className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-accent/40"
          placeholder="What exactly counts as success? Add details the voters can judge."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">Reward token</label>
          <select
            value={form.rewardToken}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, rewardToken: event.target.value }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/40"
          >
            {tokens.map((token) => (
              <option key={token.address} value={token.address} className="bg-zinc-900">
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">Reward amount</label>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={form.rewardAmount}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, rewardAmount: event.target.value }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-accent/40"
            placeholder="10"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white/80">Deadline</label>
        <input
          required
          type="datetime-local"
          min={minDeadline}
          value={form.deadline}
          onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/40"
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending transaction..." : "Post Dare"}
      </button>
    </form>
  );
}
