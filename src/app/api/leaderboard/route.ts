import { NextResponse } from "next/server";
import { getLeaderboard, getIngestedTournaments } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leaderboard = await getLeaderboard();
    const tournaments = await getIngestedTournaments();

    return NextResponse.json({
      players: leaderboard,
      tournaments,
      totalTournaments: tournaments.length,
      lastUpdated: tournaments.length > 0
        ? tournaments[tournaments.length - 1].ingestedAt
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
