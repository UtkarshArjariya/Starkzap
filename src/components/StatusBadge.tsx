import { cn } from "@/lib/utils";
import type { DareStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  DareStatus,
  { label: string; className: string; dotClassName: string }
> = {
  Open: {
    label: "Open",
    className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    dotClassName: "bg-emerald-300",
  },
  Claimed: {
    label: "Claimed",
    className: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    dotClassName: "bg-sky-300",
  },
  Voting: {
    label: "Voting",
    className: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    dotClassName: "bg-amber-200 animate-pulse",
  },
  Approved: {
    label: "Approved",
    className: "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
    dotClassName: "bg-fuchsia-200",
  },
  Rejected: {
    label: "Rejected",
    className: "border-rose-300/20 bg-rose-300/10 text-rose-100",
    dotClassName: "bg-rose-200",
  },
  Expired: {
    label: "Expired",
    className: "border-slate-300/10 bg-slate-300/5 text-slate-300",
    dotClassName: "bg-slate-400",
  },
  Cancelled: {
    label: "Cancelled",
    className: "border-orange-300/20 bg-orange-300/10 text-orange-200",
    dotClassName: "bg-orange-300",
  },
};

export default function StatusBadge({
  status,
  size = "sm",
}: {
  status: DareStatus;
  size?: "sm" | "lg";
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Open;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
        size === "lg" ? "text-sm" : "text-xs",
        config.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClassName)} />
      {config.label}
    </span>
  );
}
