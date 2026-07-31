/**
 * GET /api/results
 *
 * Framing-axis results. Each axis pools swipes by pole across every card on
 * that axis, and reports two verdicts: did users back it, and did the ones who
 * backed it stay.
 */

import { NextResponse } from "next/server";
import { computeAllAxes } from "@/lib/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(computeAllAxes());
}
