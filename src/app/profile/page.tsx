"use client";

import { useMemo, useState } from "react";

import DareCard from "@/components/DareCard";
import { useDares } from "@/hooks/useDares";
import { useWallet } from "@/lib/starkzap";
import { addressesEqual } from "@/lib/utils";

export default function ProfilePage() {
  const { address, connect } = useWallet();
  const { dares, isLoading } = useDares(address);
  const [tab, setTab] = useState<"dares" | "claims">("dares");

  const filtered = useMemo(() => {
    if (!address) {
      return [];
    }

    return dares.filter((dare) => {
      if (tab === "dares") {
        return addressesEqual(dare.poster, address);
      }
      // For claims, exclude the zero-address (unclaimed dares)
      if (!dare.claimer || dare.claimer === "0x0") return false;
      return addressesEqual(dare.claimer, address);
    });
  }, [address, dares, tab]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <section className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-accent-soft">
          Wallet activity
        </p>
        <h1 className="text-4xl font-semibold text-white">
          Your dares and claims.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
          Track what you posted, what you claimed, and what is waiting for proof
          or finalization.
        </p>

        {!address ? (
          <div className="mt-8 rounded-[28px] border border-white/10 bg-black/20 p-6">
            <p className="text-white/70">
              Connect your wallet session to see your activity feed.
            </p>
            <button
              type="button"
              onClick={() => void connect()}
              className="mt-4 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark"
            >
              Connect
            </button>
          </div>
        ) : (
          <>
            <div className="mt-8 flex gap-2">
              <TabButton
                active={tab === "dares"}
                onClick={() => setTab("dares")}
              >
                My Dares
              </TabButton>
              <TabButton
                active={tab === "claims"}
                onClick={() => setTab("claims")}
              >
                My Claims
              </TabButton>
            </div>

            <div className="mt-6">
              {isLoading ? (
                <div className="rounded-[28px] border border-white/10 bg-black/20 px-6 py-16 text-center text-white/55">
                  Loading activity...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-[28px] border border-white/10 bg-black/20 px-6 py-16 text-center text-white/55">
                  Nothing here yet.
                </div>
              ) : (
                <div className="grid gap-4">
                  {filtered.map((dare) => (
                    <DareCard key={dare.id.toString()} dare={dare} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-ink"
          : "border border-white/10 bg-white/5 text-white/70 hover:border-accent/40 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
