import { NextRequest, NextResponse } from "next/server";
import { requireAdminPin } from "@/lib/admin-auth";
import { getPendingAliases, dismissPendingAlias, confirmPendingAlias } from "@/lib/store";
import { revalidateAllData } from "@/lib/revalidate";

export async function GET(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  const pending = await getPendingAliases();
  return NextResponse.json({ pending });
}

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  try {
    const { username, canonicalId } = await request.json();
    if (!username || !canonicalId) {
      return NextResponse.json({ error: "Both username and canonicalId are required" }, { status: 400 });
    }
    await confirmPendingAlias(username, canonicalId);
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
  const username = new URL(request.url).searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username query param is required" }, { status: 400 });
  }
  await dismissPendingAlias(username);
  return NextResponse.json({ success: true });
}
