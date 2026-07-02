import { NextResponse } from "next/server";
import { getLeaderboard, getIngestedTournaments, getLastRecalculated } from "@/lib/store";

export async function GET() {
  try {
    const [leaderboard, tournaments, lastRecalculated] = await Promise.all([
      getLeaderboard(),
      getIngestedTournaments(),
      getLastRecalculated(),
    ]);

    return NextResponse.json({
      players: leaderboard,
      tournaments,
      totalTournaments: tournaments.length,
      lastUpdated: lastRecalculated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
