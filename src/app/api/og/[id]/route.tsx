import { ImageResponse } from "next/og";
import { getDare } from "@/lib/contract";
import { formatAmount, getTokenDecimals, getTokenSymbol } from "@/lib/config";
import type { DareStatus } from "@/lib/types";

export const runtime = "nodejs";

// 1200×630 is the standard OG image size
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

function statusColor(status: DareStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case "Open":
      return { bg: "#0e3a2f", text: "#4ade80", border: "#16a34a" };
    case "Claimed":
      return { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb" };
    case "Voting":
      return { bg: "#3b2f0a", text: "#fbbf24", border: "#d97706" };
    case "Approved":
      return { bg: "#0e3a2f", text: "#34d399", border: "#059669" };
    case "Rejected":
      return { bg: "#3b0f0f", text: "#f87171", border: "#dc2626" };
    case "Expired":
      return { bg: "#1e1e2e", text: "#94a3b8", border: "#475569" };
    default:
      return { bg: "#1e1e2e", text: "#94a3b8", border: "#475569" };
  }
}

function formatDeadline(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor((diff % 3600) / 60);
  return `${mins}m left`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let title = "Dare Board";
  let description = "Post public dares, lock Starknet rewards, let the community decide.";
  let rewardLabel = "";
  let statusLabel = "Open";
  let statusStyle = statusColor("Open");
  let deadlineLabel = "";
  let dareIdLabel = "";

  try {
    const dare = await getDare(BigInt(id));
    const symbol = getTokenSymbol(dare.rewardToken);
    const amount = formatAmount(dare.rewardAmount, getTokenDecimals(dare.rewardToken));

    title = dare.title || "Untitled Dare";
    rewardLabel = `${amount} ${symbol}`;
    statusLabel = dare.status;
    statusStyle = statusColor(dare.status);
    deadlineLabel = formatDeadline(dare.deadline);
    dareIdLabel = `#${id}`;

    // Build a short description from the dare
    const rawDesc = dare.description?.trim() || "";
    description = rawDesc.length > 0
      ? rawDesc.slice(0, 120) + (rawDesc.length > 120 ? "…" : "")
      : `A ${amount} ${symbol} dare on Starknet.`;
  } catch {
    // Dare not found — render a generic branded image
    title = "Dare Not Found";
    description = "This dare may no longer exist.";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_WIDTH,
          height: OG_HEIGHT,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f172a 0%, #0d1117 45%, #0c0f1a 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(217,70,239,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "32px 56px 0 56px",
          }}
        >
          {/* Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #06b6d4, #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
                ⚡
              </div>
            </div>
            <span style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Dare Board
            </span>
          </div>

          {/* Dare id + status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {dareIdLabel ? (
              <span style={{ color: "#475569", fontSize: 18, fontFamily: "monospace" }}>
                {dareIdLabel}
              </span>
            ) : null}
            {statusLabel ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: statusStyle.bg,
                  border: `1.5px solid ${statusStyle.border}`,
                  borderRadius: 999,
                  padding: "6px 18px",
                }}
              >
                <span style={{ color: statusStyle.text, fontSize: 16, fontWeight: 600, letterSpacing: "0.04em" }}>
                  {statusLabel.toUpperCase()}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 56px",
          }}
        >
          {/* Reward chip */}
          {rewardLabel ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(217,70,239,0.12)",
                  border: "1.5px solid rgba(217,70,239,0.25)",
                  borderRadius: 999,
                  padding: "6px 20px",
                }}
              >
                <span style={{ color: "#e879f9", fontSize: 18, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Reward {rewardLabel}
                </span>
              </div>
            </div>
          ) : null}

          {/* Dare title */}
          <div
            style={{
              color: "#f8fafc",
              fontSize: title.length > 50 ? 44 : 56,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: 1000,
              marginBottom: 24,
              // Multi-line clamping via overflow hidden + fixed height
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {title}
          </div>

          {/* Description */}
          <div
            style={{
              color: "#94a3b8",
              fontSize: 22,
              lineHeight: 1.55,
              maxWidth: 880,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {description}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 56px 36px 56px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 24,
          }}
        >
          <span style={{ color: "#475569", fontSize: 16 }}>
            dareboard.vercel.app
          </span>

          {deadlineLabel ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: deadlineLabel === "Expired" ? "#475569" : "#06b6d4",
                }}
              />
              <span style={{ color: "#64748b", fontSize: 16 }}>
                {deadlineLabel}
              </span>
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#334155", fontSize: 15 }}>Powered by</span>
            <span style={{ color: "#06b6d4", fontSize: 15, fontWeight: 600 }}>Starknet</span>
          </div>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
    },
  );
}
