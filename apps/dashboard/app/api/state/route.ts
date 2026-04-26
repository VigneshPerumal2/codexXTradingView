import { NextResponse } from "next/server";
import { sampleDashboardState } from "@codex-tv/shared";

export async function GET() {
  return NextResponse.json(sampleDashboardState);
}
