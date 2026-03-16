"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

type CountdownTimerProps = {
  targetTimestamp: number;
  label?: string;
  compact?: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return "Ended";
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  }

  if (hours > 0) {
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  return `${pad(minutes)}m ${pad(seconds)}s`;
}

export default function CountdownTimer({
  targetTimestamp,
  label = "Ends in",
  compact = false,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, targetTimestamp - Math.floor(Date.now() / 1000));
      setRemaining(diff);
    };

    update();
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [targetTimestamp]);

  const expired = remaining <= 0;
  const urgent = remaining > 0 && remaining < 3600;
  const tone = expired ? "text-slate-500" : urgent ? "text-rose-300" : "text-slate-400";

  if (compact) {
    return (
      <span className={`font-mono text-xs ${tone}`} data-testid="countdown-compact">
        {expired ? "Expired" : formatRemaining(remaining)}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 text-sm ${tone}`} data-testid="countdown-timer">
      <Clock3 className="h-3.5 w-3.5" />
      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="font-mono text-xs font-medium">{expired ? "Ended" : formatRemaining(remaining)}</span>
    </div>
  );
}
