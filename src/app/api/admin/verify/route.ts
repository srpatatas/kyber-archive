import { NextRequest, NextResponse } from "next/server";
import { requireAdminPin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  return NextResponse.json({ success: true });
}
