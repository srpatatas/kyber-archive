import { NextResponse } from "next/server";
import { forceRecalculate } from "@/lib/store";

export async function POST() {
  try {
    forceRecalculate();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
