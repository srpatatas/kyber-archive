import { NextRequest, NextResponse } from "next/server";
import { getMetaStats, MetaEra } from "@/lib/meta";

const VALID_ERAS: MetaEra[] = ["current", "pre-rotation", "all-time"];

export async function GET(request: NextRequest) {
  try {
    const era = (request.nextUrl.searchParams.get("era") ?? "current") as MetaEra;
    if (!VALID_ERAS.includes(era)) {
      return NextResponse.json({ error: "Invalid era" }, { status: 400 });
    }
    const stats = await getMetaStats(era);
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
