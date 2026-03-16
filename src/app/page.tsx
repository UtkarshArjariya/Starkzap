"use client";

import Link from "next/link";
import { useMemo } from "react";

import DareCard from "@/components/DareCard";
import { useDares } from "@/hooks/useDares";
import { useWallet } from "@/lib/starkzap";
import { addressesEqual, isActiveStatus, isCompletedStatus } from "@/lib/utils";

export default function HomePage() {
  const { address } = useWallet();
  const { dares, isLoading, error } = useDares(address);

  const activeDares = useMemo(
    () => dares.filter((d) => isActiveStatus(d.status)),
    [dares],
  );

  const pastDares = useMemo(
    () => dares.filter((d) => isCompletedStatus(d.status)),
    [dares],
  );

  const myDares = useMemo(() => {
    if (!address) return [];
    return dares.filter((d) => addressesEqual(d.poster, address));
  }, [dares, address]);

  const myClaims = useMemo(() => {
    if (!address) return [];
    return dares.filter(
      (d) => addressesEqual(d.claimer, address) && d.claimer !== "0x0",
    );
  }, [dares, address]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-accent-soft">
            Social login. Gasless votes. Public escrow.
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Turn internet bravado into escrowed, vote-settled dares.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/68">
            Anyone can post a dare with STRK or ETH locked on Starknet Sepolia.
            A claimer submits proof, the crowd votes, and the contract releases
            the reward.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/create"
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark"
            >
              Post a Dare
            </Link>
            <Link
              href="/profile"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-accent/40 hover:text-white"
            >
              View My Activity
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <StatCard label="Active dares" value={String(activeDares.length)} />
          <StatCard
            label="Voting now"
            value={String(
              dares.filter((dare) => dare.status === "Voting").length,
            )}
          />
          <StatCard label="Resolved" value={String(pastDares.length)} />
        </div>
      </section>

      {/* Your Activity (wallet connected) */}
      {address ? (
        <section className="mt-10">
          <SectionHeading title="Your Activity" />
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
                My Dares ({myDares.length})
              </p>
              {myDares.length === 0 ? (
                <EmptyState label="You haven't posted any dares yet." />
              ) : (
                <div className="grid gap-4">
                  {myDares.slice(0, 3).map((dare) => (
                    <DareCard key={dare.id.toString()} dare={dare} />
                  ))}
                  {myDares.length > 3 ? (
                    <Link
                      href="/profile"
                      className="text-center text-sm font-medium text-accent-soft hover:text-white"
                    >
                      View all {myDares.length} dares
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
                My Claims ({myClaims.length})
              </p>
              {myClaims.length === 0 ? (
                <EmptyState label="You haven't claimed any dares yet." />
              ) : (
                <div className="grid gap-4">
                  {myClaims.slice(0, 3).map((dare) => (
                    <DareCard key={dare.id.toString()} dare={dare} />
                  ))}
                  {myClaims.length > 3 ? (
                    <Link
                      href="/profile"
                      className="text-center text-sm font-medium text-accent-soft hover:text-white"
                    >
                      View all {myClaims.length} claims
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Active Dares */}
      <section className="mt-10">
        <SectionHeading
          title="Active Dares"
          subtitle="Open, claimed, or in voting"
          trailing="Refreshing every 15s"
        />

        {isLoading ? (
          <EmptyState label="Loading dares from Starknet..." />
        ) : error ? (
          <EmptyState label={error} />
        ) : activeDares.length === 0 ? (
          <EmptyState label="No active dares right now." />
        ) : (
          <div className="grid gap-4">
            {activeDares.map((dare) => (
              <DareCard key={dare.id.toString()} dare={dare} />
            ))}
          </div>
        )}
      </section>

      {/* Past Dares */}
      {!isLoading && pastDares.length > 0 ? (
        <section className="mt-10">
          <SectionHeading
            title="Past Dares"
            subtitle="Approved, rejected, or expired"
          />
          <div className="grid gap-4">
            {pastDares.map((dare) => (
              <DareCard key={dare.id.toString()} dare={dare} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function SectionHeading({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-white/45">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? <p className="text-sm text-white/45">{trailing}</p> : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] px-6 py-16 text-center text-white/55">
      {label}
    </div>
  );
}
