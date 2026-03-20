"use client";

import { useMemo } from "react";
import { Flame, Zap, Trophy, Users, Sparkles } from "lucide-react";
import { formatAmount, getTokenDecimals, getTokenSymbol, shortAddress } from "@/lib/config";
import type { Dare } from "@/lib/types";

interface TickerEvent {
  id: string;
  type: "posted" | "claimed" | "voting" | "approved";
  address: string;
  dareTitle: string;
  amount?: string;
  token?: string;
}

const eventConfig = {
  posted: { icon: Flame, color: "text-warning", verb: "posted" },
  claimed: { icon: Zap, color: "text-primary", verb: "claimed" },
  voting: { icon: Users, color: "text-accent", verb: "is voting on" },
  approved: { icon: Trophy, color: "text-success", verb: "won" },
};

function deriveEvents(dares: Dare[]): TickerEvent[] {
  const events: TickerEvent[] = [];
  for (const dare of dares) {
    const reward = formatAmount(dare.rewardAmount, getTokenDecimals(dare.rewardToken));
    const token = getTokenSymbol(dare.rewardToken);

    if (dare.status === "Open") {
      events.push({
        id: `${dare.id}-posted`,
        type: "posted",
        address: shortAddress(dare.poster),
        dareTitle: dare.title,
        amount: reward,
        token,
      });
    } else if (dare.status === "Claimed") {
      events.push({
        id: `${dare.id}-claimed`,
        type: "claimed",
        address: shortAddress(dare.claimer),
        dareTitle: dare.title,
      });
    } else if (dare.status === "Voting") {
      events.push({
        id: `${dare.id}-voting`,
        type: "voting",
        address: shortAddress(dare.claimer),
        dareTitle: dare.title,
      });
    } else if (dare.status === "Approved") {
      events.push({
        id: `${dare.id}-approved`,
        type: "approved",
        address: shortAddress(dare.claimer),
        dareTitle: dare.title,
        amount: reward,
        token,
      });
    }
  }
  return events;
}

function TickerItem({ event }: { event: TickerEvent }) {
  const config = eventConfig[event.type];
  const Icon = config.icon;

  return (
    <div className="flex shrink-0 items-center gap-3 rounded-full border border-border bg-secondary/50 px-4 py-2 backdrop-blur-sm">
      <Icon className={`h-4 w-4 ${config.color}`} />
      <span className="text-sm">
        <span className="font-mono font-medium text-foreground">{event.address}</span>
        <span className="text-muted-foreground"> {config.verb} </span>
        <span className="font-medium text-foreground">&quot;{event.dareTitle.length > 25 ? event.dareTitle.slice(0, 25) + "..." : event.dareTitle}&quot;</span>
        {event.amount && (
          <span className="text-accent"> for {event.amount} {event.token}</span>
        )}
      </span>
    </div>
  );
}

interface LiveTickerProps {
  dares?: Dare[];
}

export function LiveTicker({ dares = [] }: LiveTickerProps) {
  const events = useMemo(() => deriveEvents(dares), [dares]);

  if (events.length === 0) {
    return (
      <div className="relative w-full overflow-hidden border-y border-border bg-background/50 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 px-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            Welcome to Dare Board — post or claim a dare to get started!
          </span>
        </div>
      </div>
    );
  }

  // Duplicate events for seamless scrolling animation
  const allEvents = [...events, ...events];

  return (
    <div className="relative w-full overflow-hidden border-y border-border bg-background/50 py-3 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div className="flex animate-ticker gap-4">
        {allEvents.map((event, idx) => (
          <TickerItem key={`${event.id}-${idx}`} event={event} />
        ))}
      </div>
    </div>
  );
}
