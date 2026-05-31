import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | The Midichlorian Index",
};

const factionTiers = [
  {
    rating: "3,200+",
    jedi: "Grand Master",
    rebels: "General",
    sith: "Sith Lord",
    empire: "Grand Admiral",
  },
  {
    rating: "2,700–3,199",
    jedi: "Jedi Master",
    rebels: "Commander",
    sith: "Darth",
    empire: "Grand Moff",
  },
  {
    rating: "1,900–2,699",
    jedi: "Jedi Knight",
    rebels: "Lieutenant",
    sith: "Sith Warrior",
    empire: "Captain",
  },
  {
    rating: "1,650–1,899",
    jedi: "Padawan",
    rebels: "Trooper",
    sith: "Apprentice",
    empire: "Officer",
  },
  {
    rating: "< 1,650",
    jedi: "Youngling",
    rebels: "Recruit",
    sith: "Acolyte",
    empire: "Cadet",
  },
];

export default function AboutPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          About The Midichlorian Index
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-sand-light">
          <p>
            The Midichlorian Index is a competitive ranking system for{" "}
            <strong className="text-foreground">Star Wars: Unlimited</strong>{" "}
            TCG players. Just as midichlorians indicate a being&apos;s
            connection to the Force, our rating system measures a player&apos;s
            competitive strength across sanctioned tournaments.
          </p>

          <p>
            Your Midichlorian Index is calibrated from your competitive
            performance, not a blood test. In the lore, a normal human has
            roughly 2,500 midichlorians per cell while Anakin Skywalker — the
            Chosen One — measured over 20,000. Our scale compresses that range
            into a competitive Elo-style rating: new players start at{" "}
            <span className="font-medium text-gold">1,500</span> and climb
            through the ranks as they prove themselves in tournament play. The
            numbers are smaller, but the Force is just as strong.
          </p>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">How Scoring Works</h2>
            <p className="mt-2">
              The Midichlorian Index uses a progressive scoring system inspired
              by the Jedi path &mdash; your score only goes up, never down.
              Every match is a learning experience, but winning is how you grow.
            </p>
            <ul className="mt-4 space-y-3">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                  1
                </span>
                <span>
                  Players start at{" "}
                  <span className="font-medium text-gold">1,500</span>. Your score
                  can only increase &mdash; losses don&apos;t subtract points.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                  2
                </span>
                <span>
                  <span className="font-medium text-emerald-400">Wins</span> earn
                  base points scaled by event tier. Higher-tier events award more
                  points per win.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                  3
                </span>
                <span>
                  <span className="font-medium text-foreground">Draws</span>{" "}
                  earn +1 point &mdash; recognizing strategic intentional draws when
                  you&apos;ve already secured your position.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                  4
                </span>
                <span>
                  <span className="font-medium text-gold">Upset bonus</span>: +2
                  extra points when you defeat a higher-rated opponent, rewarding
                  growth and underdog victories.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                  5
                </span>
                <span>
                  <span className="font-medium text-foreground">Top cut bonuses</span>{" "}
                  reward placement in the elimination rounds &mdash; the higher
                  the event tier and the better your finish, the bigger the bonus.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">Event Tiers</h2>
            <p className="mt-2">
              Each event is classified into a tier that determines points per
              win and placement bonuses:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-2 pr-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Tier</th>
                    <th className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted">Per Win</th>
                    <th className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted">1st</th>
                    <th className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted">2nd</th>
                    <th className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted">3rd-4th</th>
                    <th className="pb-2 pl-3 text-center text-xs font-medium uppercase tracking-wider text-muted">5th-8th</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {[
                    { tier: "Padawan", color: "text-muted", win: 4, p1: 10, p2: 5, p34: 3, p58: "-" },
                    { tier: "Minor Tournament", color: "text-emerald-400", win: 6, p1: 25, p2: 15, p34: 10, p58: "5" },
                    { tier: "Store Showdown", color: "text-sky-400", win: 6, p1: 25, p2: 15, p34: 10, p58: "5" },
                    { tier: "Major Tournament", color: "text-purple-400", win: 8, p1: 40, p2: 30, p34: 20, p58: "10" },
                    { tier: "Planetary Qualifier", color: "text-gold", win: 10, p1: 60, p2: 45, p34: 30, p58: "15" },
                    { tier: "Sector Championship", color: "text-orange-400", win: 12, p1: 80, p2: 60, p34: 40, p58: "20" },
                    { tier: "Galactic Championship", color: "text-red-400", win: 15, p1: 100, p2: 75, p34: 50, p58: "25" },
                  ].map((row) => (
                    <tr key={row.tier}>
                      <td className={`py-2 pr-3 font-medium ${row.color}`}>{row.tier}</td>
                      <td className="py-2 px-3 text-center tabular-nums text-foreground">+{row.win}</td>
                      <td className="py-2 px-3 text-center tabular-nums text-gold">+{row.p1}</td>
                      <td className="py-2 px-3 text-center tabular-nums text-sand-light">+{row.p2}</td>
                      <td className="py-2 px-3 text-center tabular-nums text-muted">+{row.p34}</td>
                      <td className="py-2 pl-3 text-center tabular-nums text-muted">{row.p58 === "-" ? "-" : `+${row.p58}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Win points are further scaled by the quality multiplier (see below).
              Sanctioned Store Showdowns always count as Showdown tier regardless
              of player count.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">Quality Multiplier</h2>
            <p className="mt-2">
              Your points per win are scaled by how well you perform at each
              tournament. A strong showing amplifies your gains, while a poor
              record reduces them. This ensures that quality matters more than
              volume.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-2 pr-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Win Rate</th>
                    <th className="pb-2 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Example</th>
                    <th className="pb-2 pl-3 text-center text-xs font-medium uppercase tracking-wider text-muted">Multiplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {[
                    { wr: "83%", ex: "5-1 record", mult: "1.4x", color: "text-emerald-400" },
                    { wr: "67%", ex: "4-2 record", mult: "1.2x", color: "text-emerald-400" },
                    { wr: "50%", ex: "3-3 record", mult: "1.0x", color: "text-foreground" },
                    { wr: "33%", ex: "2-4 record", mult: "0.8x", color: "text-red-400" },
                    { wr: "17%", ex: "1-5 record", mult: "0.6x", color: "text-red-400" },
                  ].map((row) => (
                    <tr key={row.wr}>
                      <td className="py-2 pr-3 font-medium text-foreground">{row.wr}</td>
                      <td className="py-2 px-3 text-muted">{row.ex}</td>
                      <td className={`py-2 pl-3 text-center font-bold tabular-nums ${row.color}`}>{row.mult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Players with 50%+ win rate at a tournament also earn a participation
              bonus (+5 × multiplier), rewarding consistent competitors. Below 50%
              you only earn points from your individual wins.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">The Chosen One</h2>
            <p className="mt-2">
              The <span className="font-bold text-gold">Chosen One</span> is a
              special title reserved for the <strong className="text-foreground">#1
              ranked player</strong>{" "}regardless of faction. There can only be one
              Chosen One at any time &mdash; just as the prophecy foretold. Lose
              the top spot, and the title passes to whoever claims it.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">Factions &amp; Tiers</h2>
            <p className="mt-2">
              Choose your allegiance. Each faction has its own rank progression
              based on your Midichlorian Index rating:
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-2 pr-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Rating</th>
                    <th className="pb-2 px-3">
                      <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-2 text-center">
                        <p className="text-xs font-medium uppercase tracking-wider text-sky-400">Jedi Order</p>
                        <p className="mt-0.5 text-[10px] text-muted">Light · Force</p>
                      </div>
                    </th>
                    <th className="pb-2 px-3">
                      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2 text-center">
                        <p className="text-xs font-medium uppercase tracking-wider text-orange-400">Rebel Alliance</p>
                        <p className="mt-0.5 text-[10px] text-muted">Light · Military</p>
                      </div>
                    </th>
                    <th className="pb-2 px-3">
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-center">
                        <p className="text-xs font-medium uppercase tracking-wider text-red-400">Sith Order</p>
                        <p className="mt-0.5 text-[10px] text-muted">Dark · Force</p>
                      </div>
                    </th>
                    <th className="pb-2 pl-3">
                      <div className="rounded-lg border border-slate-400/20 bg-slate-400/5 p-2 text-center">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-300">Galactic Empire</p>
                        <p className="mt-0.5 text-[10px] text-muted">Dark · Military</p>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {factionTiers.map((row) => (
                    <tr key={row.rating}>
                      <td className="py-2 pr-3 font-medium text-gold tabular-nums">{row.rating}</td>
                      <td className="py-2 px-3 text-center text-sky-400">{row.jedi}</td>
                      <td className="py-2 px-3 text-center text-orange-400">{row.rebels}</td>
                      <td className="py-2 px-3 text-center text-red-400">{row.sith}</td>
                      <td className="py-2 pl-3 text-center text-slate-300">{row.empire}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">Aspects</h2>
            <p className="mt-2">
              Each player&apos;s preferred Aspect reflects their dominant playstyle
              in Star Wars: Unlimited:
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { name: "Vigilance", abbrev: "VIG", color: "#6694ce", desc: "Defensive and protective strategies" },
                { name: "Command", abbrev: "CMD", color: "#41ad49", desc: "Leadership and unit coordination" },
                { name: "Aggression", abbrev: "AGG", color: "#d2232a", desc: "Aggressive direct combat" },
                { name: "Cunning", abbrev: "CUN", color: "#fdb933", desc: "Tricks, disruption, and resource denial" },
                { name: "Heroism", abbrev: "HER", color: "#c6c1a0", desc: "Light side courage and sacrifice" },
                { name: "Villainy", abbrev: "VIL", color: "#040004", desc: "Dark side power and domination" },
              ].map((aspect) => (
                <div
                  key={aspect.name}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-background p-3"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: aspect.color, boxShadow: aspect.name === "Villainy" ? "0 0 0 1px rgba(255,255,255,0.2)" : undefined }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{aspect.name}</p>
                      <span
                        className="rounded px-1 py-px text-[8px] font-bold leading-tight"
                        style={{
                          backgroundColor: aspect.name === "Villainy" ? aspect.color : `${aspect.color}25`,
                          color: aspect.name === "Villainy" ? "#ffffff" : aspect.color,
                          border: `1px solid ${aspect.name === "Villainy" ? "rgba(255,255,255,0.25)" : `${aspect.color}40`}`,
                        }}
                      >
                        {aspect.abbrev}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{aspect.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted">
            The Midichlorian Index is a fan-made project and is not affiliated
            with Fantasy Flight Games, Lucasfilm Ltd., or The Walt Disney
            Company. Star Wars: Unlimited and all related marks are trademarks of
            Lucasfilm Ltd.
          </p>
        </div>
      </div>
    </main>
  );
}
