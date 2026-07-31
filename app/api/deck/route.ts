/**
 * GET /api/deck?userId=...
 *
 * Returns the cards this user has not yet swiped, each already resolved to the
 * variant that user is assigned. The assignment is computed here rather than
 * in the browser so the client never chooses its own bucket — and because the
 * hash is deterministic, the server reaches the same answer again when the
 * swipe comes back.
 */

import { NextResponse } from "next/server";
import { assignVariant } from "@/lib/assign";
import { CARDS, variantHash } from "@/lib/cards";
import { getSwipedCardIds } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const seen = new Set(getSwipedCardIds(userId));

  const deck = CARDS.filter((card) => !seen.has(card.id)).map((card) => {
    const variant = assignVariant(userId, card.id);
    return {
      id: card.id,
      ticker: card.ticker,
      company: card.company,
      sector: card.sector,
      variant,
      contentHash: variantHash(card, variant),
      axis: card.axis,
      pole: card.variants[variant].pole,
      content: card.variants[variant],
    };
  });

  return NextResponse.json({ userId, deck, seenCount: seen.size });
}
