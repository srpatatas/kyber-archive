import { NextResponse } from "next/server";
import { getTournamentDetail } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await getTournamentDetail(parseInt(id, 10));
  if (!detail) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
