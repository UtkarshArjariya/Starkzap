export default function LoadingSpinner({ size = "md", text = "" }) {
  const dim = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" }[size] ?? "w-6 h-6";
  return (
    <div className="flex items-center gap-2 text-gray-400" data-testid="loading-spinner">
      <span
        className={`${dim} border-2 border-white/20 border-t-purple-400 rounded-full animate-spin`}
      />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}
