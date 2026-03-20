"use client";

import { Flame, Zap, Trophy, Users } from "lucide-react";

interface TickerEvent {
  id: string;
  type: "posted" | "claimed" | "voted" | "approved";
  address: string;
  dareTitle: string;
  amount?: number;
  token?: string;
}

const mockEvents: TickerEvent[] = [
  { id: "1", type: "posted", address: "0xAb3f...7c2a", dareTitle: "Run 10km in under 50 minutes", amount: 25, token: "STRK" },
  { id: "2", type: "claimed", address: "0x7c2a...Fb9d", dareTitle: "Eat a ghost pepper" },
  { id: "3", type: "approved", address: "0x9e1c...3a7b", dareTitle: "Cold shower for 30 days", amount: 50, token: "STRK" },
  { id: "4", type: "voted", address: "0x2d4f...8e1c", dareTitle: "Learn 100 Japanese characters" },
  { id: "5", type: "posted", address: "0xBc8d...4f2e", dareTitle: "No social media for a week", amount: 15, token: "STRK" },
  { id: "6", type: "claimed", address: "0x5e3a...9c7d", dareTitle: "Do 100 pushups daily" },
  { id: "7", type: "approved", address: "0x1a2b...5c6d", dareTitle: "Meditate for 30 days", amount: 30, token: "STRK" },
  { id: "8", type: "posted", address: "0x8f4e...2b1a", dareTitle: "Read 5 books this month", amount: 20, token: "STRK" },
];

const eventConfig = {
  posted: { icon: Flame, color: "text-warning", verb: "posted" },
  claimed: { icon: Zap, color: "text-primary", verb: "claimed" },
  voted: { icon: Users, color: "text-accent", verb: "voted on" },
  approved: { icon: Trophy, color: "text-success", verb: "won" },
};

function TickerItem({ event }: { event: TickerEvent }) {
  const config = eventConfig[event.type];
  const Icon = config.icon;

  return (
    <div className="flex shrink-0 items-center gap-3 rounded-full border border-border bg-secondary/50 px-4 py-2 backdrop-blur-sm">
      <Icon className={`h-4 w-4 ${config.color}`} />
      <span className="text-sm">
        <span className="font-mono font-medium text-foreground">{event.address}</span>
        <span className="text-muted-foreground"> {config.verb} </span>
        <span className="font-medium text-foreground">&quot;{event.dareTitle.slice(0, 25)}...&quot;</span>
        {event.amount && (
          <span className="text-accent"> for {event.amount} {event.token}</span>
        )}
      </span>
    </div>
  );
}

export function LiveTicker() {
  const allEvents = [...mockEvents, ...mockEvents];

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
