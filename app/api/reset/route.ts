/**
 * POST /api/reset — clear every recorded swipe.
 */

import { NextResponse } from "next/server";
import { resetSwipes } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const deleted = resetSwipes();
  return NextResponse.json({ ok: true, deleted });
}
