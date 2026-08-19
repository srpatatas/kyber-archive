import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | The Kyber Archive",
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          About The Kyber Archive
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-sand-light">
          <p>
            The Kyber Archive is a competitive ranking system for{" "}
            <strong className="text-foreground">Star Wars: Unlimited</strong>{" "}
            TCG players in Argentina. Like a Jedi library preserving the
            records of every lightsaber duel and every trial overcome, the
            Archive catalogs competitive performance across sanctioned
            tournaments played in the country.
          </p>

          <p>
            In the lore, kyber crystals attune to their wielder and grow
            stronger through the bond — they cannot be forced, only earned.
            Your rating works the same way: new players start at{" "}
            <span className="font-medium text-gold">1,500</span> and their
            rating rises or falls as they prove themselves in tournament play.
            Every victory strengthens the bond. Every defeat tempers it.
          </p>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">How Scoring Works</h2>
            <p className="mt-2">
              The Kyber Archive uses an{" "}
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
                    { tier: "Minor Tournament", color: "text-emerald-400", p1: 12, p2: 8, p34: 5, p58: 2 },
                    { tier: "Store Showdown", color: "text-sky-400", p1: 12, p2: 8, p34: 5, p58: 2 },
                    { tier: "Major Tournament", color: "text-purple-400", p1: 20, p2: 15, p34: 10, p58: 5 },
                    { tier: "Planetary Qualifier", color: "text-gold", p1: 30, p2: 22, p34: 15, p58: 8 },
                    { tier: "Sector Championship", color: "text-orange-400", p1: 40, p2: 30, p34: 20, p58: 10 },
                    { tier: "Galactic Championship", color: "text-red-400", p1: 50, p2: 38, p34: 25, p58: 12 },
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
            <h2 className="text-lg font-bold text-foreground">Seasons</h2>
            <p className="mt-2">
              The Kyber Archive splits tournament history into seasons based on
              the Star Wars: Unlimited{" "}
              <strong className="text-foreground">Galactic Championship</strong>.
              Each season runs until the next Galactic Championship, when all
              ratings reset and a new season begins.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-border/50 bg-background p-4">
                <p className="text-sm font-bold text-gold">Year 2 (Current Season)</p>
                <p className="mt-1 text-xs text-muted">
                  July 28, 2026 &ndash; Present
                </p>
                <p className="mt-1 text-xs text-sand-light">
                  The current competitive season. No minimum event requirement
                  &mdash; all players who have competed in at least one tournament
                  appear on the leaderboard.
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background p-4">
                <p className="text-sm font-bold text-muted">Year 1</p>
                <p className="mt-1 text-xs text-muted">
                  July 28, 2025 &ndash; July 26, 2026
                </p>
                <p className="mt-1 text-xs text-sand-light">
                  Ended with the SWU Galactic Championship on July 26, 2026. Players
                  needed a minimum of 3 events to appear on the leaderboard.
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background p-4">
                <p className="text-sm font-bold text-muted">Year 0 (Pre-Season)</p>
                <p className="mt-1 text-xs text-muted">
                  All tournaments before July 28, 2025
                </p>
                <p className="mt-1 text-xs text-sand-light">
                  The inaugural season before the competitive calendar was
                  established. No minimum event requirement.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              The <strong className="text-foreground">All-Time</strong> tab
              shows cumulative ratings across all seasons. Each season starts
              fresh at 1,500 ELO &mdash; your all-time rating is computed from
              every tournament you&apos;ve ever played.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">Aspects</h2>
            <p className="mt-2">
              Each player&apos;s Aspects are determined by their{" "}
              <strong className="text-foreground">most-played leader + base combination</strong>{" "}
              across tournaments (minimum 2 events with the same deck). The
              Aspects shown are the ones belonging to that signature deck. If a
              player hasn&apos;t repeated any deck yet, no Aspects are displayed.
            </p>
            <p className="mt-2">
              The six Aspects in Star Wars: Unlimited are:
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

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-bold text-foreground">About the Creator</h2>
            <p className="mt-2">
              The Kyber Archive is created and maintained by{" "}
              <a href="/player/NT_srpatatas" className="font-bold text-gold hover:underline">
                NT_srpatatas
              </a>.
              All tournament data is sourced from{" "}
              <a href="https://melee.gg" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">melee.gg</a> and processed
              through the rating system described above.
            </p>
            <p className="mt-2">
              Have questions, corrections, or feedback? Reach out via the SWU
              Argentina community.
            </p>
          </div>

          <p className="text-xs text-muted">
            The Kyber Archive is in no way affiliated with Disney or Fantasy
            Flight Games. Star Wars characters, cards, logos, and art are
            property of Disney and/or Fantasy Flight Games.
          </p>
        </div>
      </div>
    </main>
  );
}
