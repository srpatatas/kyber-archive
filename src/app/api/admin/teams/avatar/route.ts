import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { requireAdminPin } from "@/lib/admin-auth";
import { updateTeamAvatar } from "@/lib/store";
import { revalidateAllData } from "@/lib/revalidate";

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const teamId = parseInt(formData.get("teamId") as string);
    const oldUrl = formData.get("oldUrl") as string | null;

    if (!file || isNaN(teamId)) {
      return NextResponse.json({ error: "file and teamId are required" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });
    }

    // Delete old avatar if it exists
    if (oldUrl) {
      try { await del(oldUrl); } catch { /* ignore */ }
    }

    const blob = await put(`team-avatars/${teamId}-${Date.now()}`, file, {
      access: "public",
      contentType: file.type,
    });

    await updateTeamAvatar(teamId, blob.url);
    revalidateAllData();
    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
