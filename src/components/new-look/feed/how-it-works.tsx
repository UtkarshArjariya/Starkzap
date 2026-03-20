"use client";

import { FileText, Target, Camera, Users, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const steps = [
  { icon: FileText, title: "Post a Dare", description: "Create a challenge and stake crypto as the bounty. Set a deadline and category.", color: "text-primary", bg: "bg-primary/20" },
  { icon: Target, title: "Someone Claims It", description: "A challenger accepts your dare and commits to completing it before the deadline.", color: "text-warning", bg: "bg-warning/20" },
  { icon: Camera, title: "Submit Proof", description: "The challenger uploads video or photo evidence proving they completed the dare.", color: "text-accent", bg: "bg-accent/20" },
  { icon: Users, title: "Community Votes", description: "Token holders vote to approve or reject the proof. Fair and decentralized.", color: "text-primary", bg: "bg-primary/20" },
  { icon: Trophy, title: "Winner Gets Paid", description: "If approved, the claimer wins the bounty. If rejected, it returns to the poster.", color: "text-success", bg: "bg-success/20" },
];

export function HowItWorks() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-border bg-card px-6 py-4 text-left transition-colors hover:bg-secondary/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">How It Works</h2>
            <p className="text-sm text-muted-foreground">New here? Learn the flow in 5 simple steps</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid gap-0 divide-y divide-border md:grid-cols-5 md:divide-x md:divide-y-0">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative p-6">
                  <span className="label-uppercase mb-3 block">Step {idx + 1}</span>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${step.bg}`}>
                    <Icon className={`h-6 w-6 ${step.color}`} />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {idx < steps.length - 1 && (
                    <div className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rotate-45 border-r border-t border-border bg-card md:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
