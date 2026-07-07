import { NextRequest, NextResponse } from "next/server";
import { recalculateElo, forceRecalculate, getLastRecalculated } from "@/lib/store";
import { recomputeNacionalStandings } from "@/lib/store";
import { recomputeMetaStats } from "@/lib/meta";
import { requireAdminPin } from "@/lib/admin-auth";
import { revalidateAllData } from "@/lib/revalidate";

const STEPS: Record<string, () => Promise<void>> = {
  elo: recalculateElo,
  nacional: recomputeNacionalStandings,
  meta: recomputeMetaStats,
};

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const step = request.nextUrl.searchParams.get("step");

  try {
    if (step && STEPS[step]) {
      await STEPS[step]();
      return NextResponse.json({ success: true, step });
    }

    await forceRecalculate();
    revalidateAllData();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
