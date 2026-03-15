import type { DareStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<DareStatus, string> = {
  Open: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
  Claimed: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30",
  Voting: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30",
  Approved: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30",
  Rejected: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30",
  Expired: "bg-white/10 text-zinc-300 ring-1 ring-white/10"
};

export default function StatusBadge({ status }: { status: DareStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}
