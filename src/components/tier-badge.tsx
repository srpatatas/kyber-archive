import { Player, Faction } from "@/lib/types";
import { getPlayerTier, factions } from "@/lib/data";

const factionStyles: Record<Faction, { color: string; bg: string; border: string }> = {
  "jedi-order": { color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/25" },
  "rebel-alliance": { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25" },
  "sith-order": { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25" },
  "galactic-empire": { color: "text-slate-300", bg: "bg-slate-400/10", border: "border-slate-400/25" },
};

const chosenOneStyle = { color: "text-gold", bg: "bg-gold/15", border: "border-gold/30" };

function FactionIcon({ faction, className }: { faction: Faction; className?: string }) {
  const cls = className ?? "h-3 w-3";
  switch (faction) {
    case "jedi-order":
      return (
        <svg viewBox="0 0 12 12" className={cls} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6" cy="6" r="3" />
          <path d="M6 1V2M6 10V11M1 6H2M10 6H11M2.5 2.5L3.2 3.2M8.8 8.8L9.5 9.5M9.5 2.5L8.8 3.2M3.2 8.8L2.5 9.5" />
        </svg>
      );
    case "rebel-alliance":
      return (
        <svg viewBox="0 0 12 12" className={cls} fill="currentColor">
          <path d="M6 1L7.5 4.5L6 3.5L4.5 4.5L6 1ZM6 3.5L3 6L4.5 4.5L6 3.5ZM6 3.5L9 6L7.5 4.5L6 3.5ZM3 6L4.5 9L5.25 7L3 6ZM9 6L7.5 9L6.75 7L9 6ZM4.5 9L6 11L7.5 9L6 8L4.5 9Z" />
        </svg>
      );
    case "sith-order":
      return (
        <svg viewBox="0 0 12 12" className={cls} fill="currentColor">
          <path d="M6 1C4.3 1 3 2.8 3 5c0 1.5.5 2.8 1.2 3.6L3 11h6L7.8 8.6C8.5 7.8 9 6.5 9 5c0-2.2-1.3-4-3-4z" />
        </svg>
      );
    case "galactic-empire":
      return (
        <svg viewBox="0 0 12 12" className={cls} fill="currentColor">
          <circle cx="6" cy="6" r="5" />
          <circle cx="6" cy="6" r="2" fill="var(--surface, #1c1917)" />
          <rect x="5.5" y="1" width="1" height="3" fill="var(--surface, #1c1917)" />
          <rect x="5.5" y="8" width="1" height="3" fill="var(--surface, #1c1917)" />
          <rect x="1" y="5.5" width="3" height="1" fill="var(--surface, #1c1917)" />
          <rect x="8" y="5.5" width="3" height="1" fill="var(--surface, #1c1917)" />
        </svg>
      );
  }
}

export function TierBadge({ player, rank }: { player: Player; rank: number }) {
  const tier = getPlayerTier(player, rank);
  const style = tier.isChosenOne ? chosenOneStyle : factionStyles[player.faction];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.color} ${style.border} ${tier.isChosenOne ? "ring-1 ring-gold/20" : ""}`}
    >
      {tier.isChosenOne ? (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
          <path d="M6 0L7.4 4.1L12 4.1L8.3 6.6L9.7 10.8L6 8.3L2.3 10.8L3.7 6.6L0 4.1L4.6 4.1Z" />
        </svg>
      ) : (
        <FactionIcon faction={player.faction} />
      )}
      {tier.name}
    </span>
  );
}

export function FactionBadge({ faction }: { faction: Faction }) {
  const info = factions[faction];
  const style = factionStyles[faction];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.color}`} title={info.name}>
      <FactionIcon faction={faction} className="h-3.5 w-3.5" />
      {info.name}
    </span>
  );
}
