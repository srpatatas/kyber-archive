import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { parseTournamentUrl } from "@/lib/melee-client";
import { isTournamentIngested } from "@/lib/store";
import { getDb } from "@/lib/db";

let activeScrape: { tournamentId: number; status: "running" | "done" | "error"; message: string } | null = null;

export async function POST(request: NextRequest) {
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
    const scriptPath = path.join(process.cwd(), "scrape.mjs");

    activeScrape = { tournamentId, status: "running", message: "Scraping..." };

    const child = spawn("node", [scriptPath, String(tournamentId), tier], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    let output = "";
    child.stdout?.on("data", (data) => { output += data.toString(); });
    child.stderr?.on("data", (data) => { output += data.toString(); });

    child.on("close", (code) => {
      if (code === 0) {
        activeScrape = { tournamentId, status: "done", message: output.trim().split("\n").pop() || "Done" };
      } else {
        activeScrape = { tournamentId, status: "error", message: output.trim().split("\n").pop() || `Exit code ${code}` };
      }
    });

    child.on("error", (err) => {
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
