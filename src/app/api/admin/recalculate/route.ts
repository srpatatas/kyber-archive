import { NextRequest, NextResponse } from "next/server";
import { forceRecalculate } from "@/lib/store";
import { requireAdminPin } from "@/lib/admin-auth";
import { revalidateAllData } from "@/lib/revalidate";

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  try {
    await forceRecalculate();
    revalidateAllData();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
