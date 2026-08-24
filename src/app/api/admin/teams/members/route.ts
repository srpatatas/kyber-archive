import { NextRequest, NextResponse } from "next/server";
import { requireAdminPin } from "@/lib/admin-auth";
import { addTeamMember, removeTeamMember, deleteTeamMember, searchPlayers } from "@/lib/store";
import { revalidateAllData } from "@/lib/revalidate";

export async function GET(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const players = await searchPlayers(q);
  return NextResponse.json({ players });
}

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  try {
    const { teamId, playerId, joinedAt } = await request.json();
    if (!teamId || !playerId || !joinedAt) {
      return NextResponse.json({ error: "teamId, playerId, and joinedAt are required" }, { status: 400 });
    }
    await addTeamMember(teamId, playerId, joinedAt);
    revalidateAllData();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  const id = parseInt(new URL(request.url).searchParams.get("id") ?? "");
  if (isNaN(id)) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }
  const hard = new URL(request.url).searchParams.get("hard") === "true";
  const removed = hard ? await deleteTeamMember(id) : await removeTeamMember(id);
  revalidateAllData();
  return NextResponse.json({ success: true, removed });
}
