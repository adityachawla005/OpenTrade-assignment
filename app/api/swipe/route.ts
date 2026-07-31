/**
 * POST /api/swipe
 * body: { userId: string, cardId: string, direction: "right" | "left" }
 *
 *   right = "back"  (conversion)
 *   left  = "pass"
 *
 * The variant is recomputed server-side from (userId, cardId). Any variant the
 * client claims is ignored: assignment is a property of the user, not of the
 * request, so a client cannot move itself between buckets.
 */

import { NextResponse } from "next/server";
import { assignVariant } from "@/lib/assign";
import { getCard, variantHash } from "@/lib/cards";
import { insertSwipe } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { userId, cardId, direction } = (body ?? {}) as Record<string, unknown>;

  if (typeof userId !== "string" || !userId.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (typeof cardId !== "string") {
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });
  }
  if (direction !== "right" && direction !== "left") {
    return NextResponse.json(
      { error: 'direction must be "right" or "left"' },
      { status: 400 },
    );
  }

  const card = getCard(cardId);
  if (!card) {
    return NextResponse.json({ error: `unknown cardId: ${cardId}` }, { status: 404 });
  }

  const variant = assignVariant(userId, cardId);
  const backed = direction === "right";
  // Stamp the swipe with the copy that was actually on screen, so a later
  // edit to this variant cannot retroactively absorb it into a new treatment.
  const shownHash = variantHash(card, variant);
  const recorded = insertSwipe(cardId, variant, userId, backed, shownHash, "ui");

  return NextResponse.json({
    recorded,
    duplicate: !recorded,
    cardId,
    variant,
    backed,
    contentHash: shownHash,
    pole: card.variants[variant].pole,
    axis: card.axis,
  });
}
