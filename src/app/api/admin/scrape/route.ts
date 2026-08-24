import { NextRequest, NextResponse } from "next/server";
import { parseTournamentUrl } from "@/lib/melee-client";
import { requireAdminPin } from "@/lib/admin-auth";

let activeScrape: { tournamentId: number; status: "running" | "done" | "error"; message: string } | null = null;

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const { url, eventTier } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const tournamentId = parseTournamentUrl(url);
    if (!tournamentId) {
      return NextResponse.json(
        { error: "Invalid tournament URL" },
        { status: 400 },
      );
    }

    if (activeScrape?.status === "running") {
      return NextResponse.json(
        { error: "A scrape is already in progress" },
        { status: 409 },
      );
    }

    const tier = eventTier || "showdown";

    activeScrape = { tournamentId, status: "running", message: "Scraping..." };

    const cp = await import("node:child_process");
    const scriptName = ["scrape", "mjs"].join(".");
    const scriptPath = [process.cwd(), scriptName].join("/");

    const child = cp.spawn("node", [scriptPath, String(tournamentId), tier], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      env: { ...process.env, PORT: String(process.env.PORT || 3000) },
    });

    let output = "";
    child.stdout?.on("data", (data: Buffer) => { output += data.toString(); });
    child.stderr?.on("data", (data: Buffer) => { output += data.toString(); });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        activeScrape = { tournamentId, status: "done", message: output.trim().split("\n").pop() || "Done" };
      } else {
        activeScrape = { tournamentId, status: "error", message: output.trim().split("\n").pop() || `Exit code ${code}` };
      }
    });

    child.on("error", (err: Error) => {
      activeScrape = { tournamentId, status: "error", message: err.message };
    });

    return NextResponse.json({
      success: true,
      message: "Scrape started",
      tournamentId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  if (!activeScrape) {
    return NextResponse.json({ status: "idle" });
  }
  return NextResponse.json(activeScrape);
}
