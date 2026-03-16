"use client";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  text?: string;
};

export default function LoadingSpinner({ size = "md", text = "" }: LoadingSpinnerProps) {
  const dimensions = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-[3px]",
  }[size];

  return (
    <div className="inline-flex items-center gap-2 text-slate-300" data-testid="loading-spinner">
      <span
        className={`${dimensions} inline-block animate-spin rounded-full border-white/15 border-t-cyan-300`}
      />
      {text ? <span className="text-sm text-slate-400">{text}</span> : null}
    </div>
  );
}
