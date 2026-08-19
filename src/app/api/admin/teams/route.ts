import { NextRequest, NextResponse } from "next/server";
import { requireAdminPin } from "@/lib/admin-auth";
import { getAdminTeams, createTeam, deleteTeam } from "@/lib/store";
import { revalidateAllData } from "@/lib/revalidate";

export async function GET(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  const teams = await getAdminTeams();
  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  try {
    const { tag, displayName } = await request.json();
    if (!tag || !displayName) {
      return NextResponse.json({ error: "Both tag and displayName are required" }, { status: 400 });
    }
    const id = await createTeam(tag, displayName);
    revalidateAllData();
    return NextResponse.json({ success: true, id });
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
  const deleted = await deleteTeam(id);
  revalidateAllData();
  return NextResponse.json({ success: true, deleted });
}
