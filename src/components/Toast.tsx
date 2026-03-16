"use client";

import { X, ExternalLink, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { STARKSCAN_URL } from "@/lib/config";

const BORDER: Record<string, string> = {
  success: "border-l-emerald-400",
  error: "border-l-rose-400",
  info: "border-l-cyan-400",
  warning: "border-l-amber-400",
};

const ICON_COLOR: Record<string, string> = {
  success: "text-emerald-300",
  error: "text-rose-300",
  info: "text-cyan-300",
  warning: "text-amber-300",
};

function ToastIcon({ type }: { type: string }) {
  const cls = `h-4 w-4 shrink-0 ${ICON_COLOR[type] ?? "text-slate-300"}`;
  if (type === "success") return <CheckCircle2 className={cls} />;
  if (type === "error") return <XCircle className={cls} />;
  if (type === "warning") return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

export default function Toasts() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-[9999] flex flex-col-reverse gap-2 sm:right-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] animate-slide-in items-start gap-3 rounded-2xl border border-white/10 border-l-4 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur-xl ${BORDER[toast.type] ?? "border-l-slate-500"}`}
        >
          <ToastIcon type={toast.type} />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-5 text-white">
              {toast.title}
            </p>
            {toast.message ? (
              <p className="mt-0.5 text-xs leading-4 text-slate-400">
                {toast.message}
              </p>
            ) : null}
            {toast.txHash ? (
              <a
                className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-300 transition hover:text-white"
                href={`${STARKSCAN_URL}/tx/${toast.txHash}`}
                rel="noreferrer"
                target="_blank"
              >
                View on Starkscan
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>

          <button
            className="shrink-0 text-slate-500 transition hover:text-white"
            onClick={() => removeToast(toast.id)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
