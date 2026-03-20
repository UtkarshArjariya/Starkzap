"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowRight, Zap, Coins, Trophy } from "lucide-react";
import Link from "next/link";

function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

interface HeroProps {
  totalDares: number;
}

export function Hero({ totalDares }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
            <span className="text-sm font-medium text-muted-foreground">Live on Starknet Sepolia</span>
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Dare. Prove.{" "}
            <span className="text-gradient">Get Paid.</span>
          </h1>

          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Post challenges with crypto bounties. Complete dares, submit proof, let the community vote. Winners take the rewards.
          </p>

          <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/create"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <Plus className="h-5 w-5" />
              Post a Dare
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-6 py-3 text-base font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-secondary"
            >
              How It Works
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={totalDares} />
                </div>
                <div className="text-xs text-muted-foreground">Total Dares</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
