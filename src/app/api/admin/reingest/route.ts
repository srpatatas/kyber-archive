import { NextRequest, NextResponse } from "next/server";
import { reingestFromCache } from "@/lib/store";
import { requireAdminPin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }
    const success = await reingestFromCache(parseInt(id, 10));
    if (!success) {
      return NextResponse.json({ error: "No cached scrape data found for this tournament" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
