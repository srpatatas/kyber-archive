/**
 * Thumbnail Crop Preview Template
 * ================================
 * Reusable preview page for checking leader thumbnail cropping when a new set drops.
 *
 * Usage:
 *   1. Copy this file to src/app/preview-{SET}/page.tsx
 *   2. Replace SET_CODE and SET_NAME with the new set (e.g. "ASH", "Ashes of the Empire")
 *   3. Replace the LEADERS array with the new set's leaders
 *   4. Run the dev server: npx next dev
 *   5. Open http://localhost:3000/preview-{SET}
 *   6. Adjust LEADER_CROP_POSITION entries in src/lib/card-images.ts as needed
 *   7. Delete src/app/preview-{SET}/ when done
 */

import { getLeaderThumbnailUrl, getLeaderCropPosition, getLeaderAspects } from "@/lib/card-images";
import { ASPECT_COLORS } from "@/lib/aspects";

// ── Customize these for the new set ──────────────────────────────────────────
const SET_CODE = "ASH";
const SET_NAME = "Ashes of the Empire";

const LEADERS: string[] = [
  // Paste leader names here, e.g.:
  // "Ahsoka Tano, Trust in the Force",
  // "Baylan Skoll, Power Beyond Dream",
];
// ─────────────────────────────────────────────────────────────────────────────

export default function PreviewSetPage() {
  const visibleColor = (c: string | undefined) => c === "#040004" ? "#4a3060" : c;

  return (
    <main className="flex-1 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gold mb-2">{SET_NAME} ({SET_CODE}) — Thumbnail Crop Preview</h1>
        <p className="text-muted-foreground mb-8">
          {LEADERS.length} leaders shown at leaderboard size (36×36), enlarged (96×96), and extra large (160×160) to check cropping.
          Current crop position shown below each card. Leaders without a custom override default to <code>&quot;center&quot;</code>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {LEADERS.map((name) => {
            const imgUrl = getLeaderThumbnailUrl(name);
            const cropPos = getLeaderCropPosition(name);
            const aspects = getLeaderAspects(name);
            const colorStops = aspects
              .filter((a) => a.toLowerCase() !== "heroism" && a.toLowerCase() !== "villainy")
              .map((a) => visibleColor(ASPECT_COLORS[a.toLowerCase()]))
              .filter(Boolean) as string[];
            if (colorStops.length === 0 && aspects.length > 0) {
              colorStops.push(visibleColor(ASPECT_COLORS[aspects[0].toLowerCase()]) ?? "#666");
            }
            const borderGradient = colorStops.length >= 2
              ? `linear-gradient(to bottom, ${colorStops.join(", ")})`
              : colorStops[0] ?? "#666";

            return (
              <div key={name} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  {/* Leaderboard size: 36×36 */}
                  <div className="w-9 h-9 rounded-lg p-[1.5px] shadow-sm flex-shrink-0" style={{ background: borderGradient }}>
                    <div className="w-full h-full rounded-[7px] overflow-hidden">
                      {imgUrl && <img src={imgUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: cropPos }} />}
                    </div>
                  </div>

                  {/* Enlarged: 96×96 */}
                  <div className="w-24 h-24 rounded-xl p-[2px] shadow-sm flex-shrink-0" style={{ background: borderGradient }}>
                    <div className="w-full h-full rounded-[10px] overflow-hidden">
                      {imgUrl && <img src={imgUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: cropPos }} />}
                    </div>
                  </div>

                  {/* Extra large: 160×160 */}
                  <div className="w-40 h-40 rounded-xl p-[2px] shadow-sm flex-shrink-0" style={{ background: borderGradient }}>
                    <div className="w-full h-full rounded-[12px] overflow-hidden">
                      {imgUrl && <img src={imgUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: cropPos }} />}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-foreground text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    crop: <code className="bg-muted px-1 py-0.5 rounded">{cropPos}</code>
                    {cropPos === "center" && <span className="ml-2 text-yellow-500">(default — no custom override)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    aspects: {aspects.join(", ")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
