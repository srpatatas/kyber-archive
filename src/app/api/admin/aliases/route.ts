import { NextRequest, NextResponse } from "next/server";
import { requireAdminPin } from "@/lib/admin-auth";
import { getAliases, addAlias, removeAlias, mergePlayerAlias } from "@/lib/store";
import { revalidateAllData } from "@/lib/revalidate";

export async function GET(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  const aliases = await getAliases();
  return NextResponse.json({ aliases });
}

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  try {
    const { alias, canonicalId } = await request.json();
    if (!alias || !canonicalId) {
      return NextResponse.json({ error: "Both alias and canonicalId are required" }, { status: 400 });
    }
    await addAlias(alias, canonicalId);
    await mergePlayerAlias(alias.toLowerCase().trim(), canonicalId.toLowerCase().trim());
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
  const alias = new URL(request.url).searchParams.get("alias");
  if (!alias) {
    return NextResponse.json({ error: "alias query param is required" }, { status: 400 });
  }
  const removed = await removeAlias(alias);
  revalidateAllData();
  return NextResponse.json({ success: true, removed });
}
