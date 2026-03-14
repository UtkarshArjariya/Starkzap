import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatRemaining(seconds) {
  if (seconds <= 0) return "Ended";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h > 0) return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  return `${pad(m)}m ${pad(s)}s`;
}

export default function CountdownTimer({ targetTimestamp, label = "Ends in", compact = false }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, targetTimestamp - Math.floor(Date.now() / 1000));
      setRemaining(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp]);

  const expired = remaining <= 0;
  const urgent = remaining > 0 && remaining < 3600;

  if (compact) {
    return (
      <span
        className={`text-xs font-mono ${expired ? "text-gray-500" : urgent ? "text-red-400" : "text-gray-400"}`}
        data-testid="countdown-compact"
      >
        {expired ? "Expired" : formatRemaining(remaining)}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-sm ${expired ? "text-gray-500" : urgent ? "text-red-400" : "text-gray-400"}`}
      data-testid="countdown-timer"
    >
      <Clock size={13} />
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`font-mono text-xs font-medium ${urgent && !expired ? "text-red-400" : ""}`}>
        {expired ? "Ended" : formatRemaining(remaining)}
      </span>
    </div>
  );
}
