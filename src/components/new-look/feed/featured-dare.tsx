"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Clock, ArrowRight, Zap } from "lucide-react";
import { formatAmount, getTokenDecimals, getTokenSymbol } from "@/lib/config";
import { extractTags } from "@/lib/categories";
import type { Dare } from "@/lib/types";

interface FeaturedDareProps {
  dare: Dare;
}

export function FeaturedDare({ dare }: FeaturedDareProps) {
  const tokenSymbol = getTokenSymbol(dare.rewardToken);
  const amount = formatAmount(dare.rewardAmount, getTokenDecimals(dare.rewardToken));
  const tags = extractTags(dare.description);

  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = dare.deadline - now;
      const hours = Math.max(0, Math.floor(diff / 3600));
      const minutes = Math.max(0, Math.floor((diff % 3600) / 60));
      setTimeLeft({ hours, minutes });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [dare.deadline]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 text-warning" />
        <span className="label-uppercase">Dare of the Day</span>
      </div>

      <Link href={`/dare/${dare.id.toString()}`}>
        <div className="group relative overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-glow lg:p-8">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold text-warning">Featured</span>
                <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-success">Open</span>
              </div>

              <h2 className="mb-2 text-2xl font-bold text-foreground lg:text-3xl">{dare.title}</h2>
              <p className="mb-4 max-w-2xl text-muted-foreground lg:text-lg">{dare.description}</p>

              <div className="flex flex-wrap items-center gap-4">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-end">
              <div className="rounded-2xl bg-accent/20 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-6 w-6 text-accent" />
                  <span className="text-3xl font-bold text-accent">{amount}</span>
                  <span className="text-lg font-medium text-accent/80">{tokenSymbol}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/50 px-4 py-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-baseline gap-1">
                  {timeLeft !== null ? (
                    <>
                      <span className="font-mono text-xl font-bold text-foreground">{timeLeft.hours}</span>
                      <span className="text-sm text-muted-foreground">h</span>
                      <span className="font-mono text-xl font-bold text-foreground">{timeLeft.minutes}</span>
                      <span className="text-sm text-muted-foreground">m left</span>
                    </>
                  ) : (
                    <span className="font-mono text-xl font-bold text-foreground">-- h -- m left</span>
                  )}
                </div>
              </div>

              <span
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                Claim This Dare
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
