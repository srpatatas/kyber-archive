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
    rebels: "Operative",
    sith: "Apprentice",
    empire: "Trooper",
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
            into a competitive Elo rating: new players start at{" "}
            <span className="font-medium text-gold">1,500</span> and their
            rating rises or falls as they prove themselves in tournament play.
            The numbers are smaller, but the Force is just as strong.
          </p>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">How Scoring Works</h2>
            <p className="mt-2">
              The Midichlorian Index uses an{" "}
              <strong className="text-foreground">ELO rating system</strong>{" "}
              enhanced with tournament tier bonuses and a Trial of Skill
              mechanic. Unlike progressive systems where scores only go up,
              your rating goes up when you win and down when you lose &mdash;
              reflecting your true competitive level at any given moment.
            </p>

            <h3 className="mt-5 text-sm font-bold text-foreground">ELO Rating</h3>
            <p className="mt-2">
              Every player starts at <span className="text-gold">1,500</span>.
              When two players face each other, rating is transferred from the
              loser to the winner based on the expected outcome. Beat someone
              much higher rated than you? You gain a lot of points and they
              lose a lot. Beat someone much lower? You gain very little. This
              naturally calibrates each player&apos;s rating to their skill level.
            </p>
            <div className="mt-3 rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-mono text-muted">
                Expected score: <span className="text-foreground">E = 1 / (1 + 10<sup>(R<sub>opponent</sub> - R<sub>you</sub>) / 400</sup>)</span>
              </p>
              <p className="text-xs font-mono text-muted mt-1">
                New rating: <span className="text-foreground">R&apos; = R + K × (S - E)</span>
                <span className="text-muted ml-2">where K=32, S=1 (win), 0 (loss), 0.5 (draw)</span>
              </p>
            </div>

            <h3 className="mt-5 text-sm font-bold text-foreground">Match Outcomes</h3>
            <ul className="mt-2 space-y-3">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                  W
                </span>
                <span>
                  <span className="font-medium text-emerald-400">Wins</span>{" "}
                  increase your rating. The amount depends on how strong your
                  opponent is &mdash; beating a higher-rated player earns more
                  points than beating a lower-rated one.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">
                  L
                </span>
                <span>
                  <span className="font-medium text-red-400">Losses</span>{" "}
                  decrease your rating. Losing to a much higher-rated opponent
                  costs you very little, while losing to someone below you costs
                  more. Rating is a zero-sum transfer between the two players.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[10px] font-bold text-muted">
                  D
                </span>
                <span>
                  <span className="font-medium text-foreground">Draws</span>{" "}
                  adjust both ratings toward 0.5 expected &mdash; the higher-rated
                  player loses a small amount and the lower-rated player gains.
                </span>
              </li>
            </ul>

            <h3 className="mt-5 text-sm font-bold text-foreground">Bonuses</h3>
            <ul className="mt-2 space-y-3">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                  ↑
                </span>
                <span>
                  <span className="font-medium text-gold">Trial of Skill</span>:{" "}
                  <span className="text-gold">+2 extra points</span>{" "}when you
                  defeat an opponent with a higher rating than yours. The
                  comparison uses each player&apos;s rating at the{" "}
                  <strong className="text-foreground">start of the tournament</strong>,
                  not mid-tournament ratings that shift with each round. In Jedi
                  lore, the Trial of Skill tests a Padawan&apos;s combat ability
                  against a stronger opponent &mdash; here it rewards underdog victories.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                  🏆
                </span>
                <span>
                  <span className="font-medium text-foreground">Top cut bonuses</span>{" "}
                  reward your final placement in the elimination rounds. The
                  higher the event tier and the better your finish, the bigger
                  the bonus (see Event Tiers table below). Tournaments with
                  fewer than 9 players record the winner but award no placement
                  bonus points.
                </span>
              </li>
            </ul>

            <h3 className="mt-5 text-sm font-bold text-foreground">Worked Example</h3>
            <p className="mt-2 text-xs text-muted">
              Player A (rated <span className="text-foreground">1,600</span>) faces
              Player B (rated <span className="text-foreground">1,500</span>) at
              a <span className="text-sky-400">Store Showdown</span>:
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs font-bold text-emerald-400">If Player A wins (expected)</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  <li>Expected score: 0.64 (64% favored)</li>
                  <li>ELO gain: 32 × (1 - 0.64) = <span className="text-emerald-400">+12 pts</span></li>
                  <li>Trial of Skill: <span className="text-muted">none (opponent rated lower)</span></li>
                  <li>Player B loses: 32 × (0 - 0.36) = <span className="text-red-400">-12 pts</span></li>
                </ul>
                <p className="mt-2 text-[10px] text-muted">A: 1,600 → 1,612 &nbsp;|&nbsp; B: 1,500 → 1,488</p>
              </div>
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-3">
                <p className="text-xs font-bold text-gold">If Player B wins (upset)</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  <li>Expected score: 0.36 (underdog)</li>
                  <li>ELO gain: 32 × (1 - 0.36) = <span className="text-emerald-400">+20 pts</span></li>
                  <li>Trial of Skill: <span className="text-gold">+2 pts (beat higher-rated)</span></li>
                  <li>Player A loses: 32 × (0 - 0.64) = <span className="text-red-400">-20 pts</span></li>
                </ul>
                <p className="mt-2 text-[10px] text-muted">B: 1,500 → 1,522 &nbsp;|&nbsp; A: 1,600 → 1,580</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Upsets are heavily rewarded: Player B gains{" "}
              <span className="text-foreground">22 points</span> (including Trial of
              Skill) while the expected winner would only gain 12. Over time, this
              self-corrects &mdash; players settle at the rating where they win about
              half their games against opponents of similar strength.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">Event Tiers</h2>
            <p className="mt-2">
              Each event is classified into a tier that determines placement
              bonuses. Top cut placements earn bonus points on top of the ELO
              gains from matches:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-2 pr-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Tier</th>
                    <th className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted">1st</th>
                    <th className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted">2nd</th>
                    <th className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted">3rd-4th</th>
                    <th className="pb-2 pl-3 text-center text-xs font-medium uppercase tracking-wider text-muted">5th-8th</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {[
                    { tier: "Minor Tournament", color: "text-emerald-400", p1: 25, p2: 15, p34: 10, p58: 5 },
                    { tier: "Store Showdown", color: "text-sky-400", p1: 25, p2: 15, p34: 10, p58: 5 },
                    { tier: "Major Tournament", color: "text-purple-400", p1: 40, p2: 30, p34: 20, p58: 10 },
                    { tier: "Planetary Qualifier", color: "text-gold", p1: 60, p2: 45, p34: 30, p58: 15 },
                    { tier: "Sector Championship", color: "text-orange-400", p1: 80, p2: 60, p34: 40, p58: 20 },
                    { tier: "Galactic Championship", color: "text-red-400", p1: 100, p2: 75, p34: 50, p58: 25 },
                  ].map((row) => (
                    <tr key={row.tier}>
                      <td className={`py-2 pr-3 font-medium ${row.color}`}>{row.tier}</td>
                      <td className="py-2 px-3 text-center tabular-nums text-gold">+{row.p1}</td>
                      <td className="py-2 px-3 text-center tabular-nums text-sand-light">+{row.p2}</td>
                      <td className="py-2 px-3 text-center tabular-nums text-muted">+{row.p34}</td>
                      <td className="py-2 pl-3 text-center tabular-nums text-muted">+{row.p58}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Placement bonuses are added on top of ELO match gains. Tournaments
              with fewer than 9 players record the winner (for the kyber crystal
              award) but do not award placement bonus points. Sanctioned Store
              Showdowns always count as Showdown tier regardless of player count.
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
