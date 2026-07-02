import { NextResponse } from "next/server";
import { getNacionalStandings } from "@/lib/store";

export async function GET() {
  try {
    const data = await getNacionalStandings();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
