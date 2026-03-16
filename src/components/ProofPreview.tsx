"use client";

import { ExternalLink } from "lucide-react";

export default function ProofPreview({ url }: { url: string }) {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/);
  if (ytMatch) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/10" style={{ paddingBottom: "56.25%" }}>
        <iframe
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title="Proof video"
        />
      </div>
    );
  }

  // Direct image
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)) {
    return (
      <img
        alt="Proof"
        className="w-full max-h-96 rounded-2xl border border-white/10 object-contain"
        src={url}
      />
    );
  }

  // Direct video
  if (/\.mp4(\?|$)/i.test(url)) {
    return (
      <video
        controls
        className="w-full max-h-96 rounded-2xl border border-white/10"
        src={url}
      />
    );
  }

  // Imgur — try to show as image with .jpg extension
  if (url.includes("imgur.com")) {
    const imgurSrc = url.replace(/\/(a\/)?/, "/") + ".jpg";
    return (
      <img
        alt="Proof"
        className="w-full max-h-96 rounded-2xl border border-white/10 object-contain"
        src={imgurSrc}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  // Fallback — styled link card
  let domain = "";
  try {
    domain = new URL(url).hostname.replace("www.", "");
  } catch {
    // ignore invalid URLs
  }

  return (
    <a
      className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/20 hover:bg-white/[0.07]"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{domain}</p>
        <p className="mt-1 truncate text-sm text-cyan-200">{url}</p>
      </div>
      <ExternalLink className="ml-3 h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-200" />
    </a>
  );
}
