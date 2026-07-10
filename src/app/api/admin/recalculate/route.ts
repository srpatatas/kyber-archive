import { NextRequest, NextResponse } from "next/server";
import { recalculateElo, forceRecalculate, stampLastRecalculated, snapshotCurrentRanks } from "@/lib/store";
import { recomputeNacionalStandings } from "@/lib/store";
import { recomputeMetaStats } from "@/lib/meta";
import { requireAdminPin } from "@/lib/admin-auth";
import { revalidateAllData } from "@/lib/revalidate";

const STEPS: Record<string, (snapshot: boolean) => Promise<void>> = {
  elo: async (snapshot) => { if (snapshot) await snapshotCurrentRanks(); await recalculateElo(); },
  nacional: async () => { await recomputeNacionalStandings(); },
  meta: async (snapshot) => { await recomputeMetaStats(snapshot); },
  stamp: async () => { await stampLastRecalculated(); revalidateAllData(); },
};

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const step = request.nextUrl.searchParams.get("step");
  const snapshot = request.nextUrl.searchParams.get("snapshot") === "true";

  try {
    if (step && STEPS[step]) {
      await STEPS[step](snapshot);
      return NextResponse.json({ success: true, step });
    }

    if (snapshot) await snapshotCurrentRanks();
    await forceRecalculate();
    revalidateAllData();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
