import { NextRequest, NextResponse } from "next/server";
import { getMetaStats, MetaPeriod } from "@/lib/meta";

const VALID_PERIODS: MetaPeriod[] = ["3m", "6m", "pre"];

export async function GET(request: NextRequest) {
  try {
    const period = (request.nextUrl.searchParams.get("period") ?? "6m") as MetaPeriod;
    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }
    const stats = await getMetaStats(period);
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
