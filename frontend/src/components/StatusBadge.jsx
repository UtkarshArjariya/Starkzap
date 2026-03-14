const STATUS_CONFIG = {
  Open:     { label: "Open",     bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/20",  dot: "bg-green-400" },
  Claimed:  { label: "Claimed",  bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20",   dot: "bg-blue-400" },
  Voting:   { label: "Voting",   bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/20",  dot: "bg-amber-400 animate-pulse" },
  Approved: { label: "Approved", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", dot: "bg-purple-400" },
  Rejected: { label: "Rejected", bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20",    dot: "bg-red-400" },
  Expired:  { label: "Expired",  bg: "bg-gray-500/10",   text: "text-gray-400",   border: "border-gray-500/20",   dot: "bg-gray-400" },
};

export default function StatusBadge({ status, size = "sm" }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Open;
  const textSize = size === "lg" ? "text-sm" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium ${textSize} ${cfg.bg} ${cfg.text} ${cfg.border}`}
      data-testid={`status-badge-${status?.toLowerCase()}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
