# Swipe A/B — what's real, and what isn't

Written to be read before the demo, not after someone finds it.

This is a working demonstration of a method, not a production system. The
statistical engine is real, tested, and I'd defend it. Several things around it
are scaffolding. Here's exactly which is which.

---

## What's real

**The sequential test.** The mSPRT engine is a genuine implementation of the
asymptotic always-valid test (Johari, Koomen, Pekelis & Walsh). It's a pure
incremental function with 38 tests around it, including two Monte Carlo suites
that *measure* rather than assert its behaviour:

- Under the null, checked after every single swipe for 3,000 swipes:
  **2.0% false positives** against a nominal 5%. Still 2.7% when the horizon is
  extended to 20,000.
- The same data with a fixed-horizon z-test peeked at the same cadence:
  **39% false positives.** That gap is the entire reason this project exists.
- Real 15-point effect: 100% power, median stop at **453 of 4,000 swipes.**

**The aggregation.** Swipes genuinely pool by framing pole across every card on
an axis — I reconciled the API output against raw SQL to confirm it, and each
arm is ~2,250 observations drawn from 3 cards, not 12 separate per-card results.

**Deterministic assignment.** `hash(cardId + userId)`, recomputed server-side so
a client can't bucket itself, salted per card so each axis is independent.

**Content-hash scoping.** Every swipe records a hash of the copy that was on
screen. Edit a card's wording and its old swipes are excluded from the live
verdict and archived visibly, rather than silently pooling two different
treatments under one label. Cosmetic whitespace edits don't trigger it.

---

## What's simulated

**All retention data.** There is no retention pipeline. The "still around a week
later" numbers are drawn from the simulator. Real swipes from the UI write
`NULL` and are excluded from that metric entirely. The dashboard states the
real/simulated split in the header so this is never ambiguous.

**Ground truth.** The dashboard can claim "never called a winner that wasn't
real" only because the simulator generated the traffic and knows which axes have
no true difference. On real data that claim would be unfalsifiable.

---

## Known limitations I'd fix before production

**Retention is measured among backers, which is a selection effect.** This is
the one I'd flag hardest. Retention is only observed for users who backed a
card — and backing is exactly what the framing changes. So the two groups being
compared aren't strictly like for like: if one framing attracts a different
*kind* of user to back, the retention gap partly reflects that, not the framing's
effect on loyalty. The "wins the swipe, loses the user" callout is therefore a
**flag worth investigating, not a proven cause**, and the UI now says so in
those words. Fixing it properly means measuring retention over everyone exposed,
not everyone who converted.

**The deck doesn't rotate.** The premise for pooling by framing is that cards
rotate daily and no individual card gathers enough volume. That's the right
architecture, but there are 12 fixed cards and no rotation implemented.

**No auth, no rate limiting.** `userId` is client-generated in localStorage.
Minting IDs in a loop would move any verdict. Fine for a demo, not tamper-proof.

**Results are recomputed by replaying the whole log per request.** ~60ms at
18,000 rows, so a non-issue at this scale, and it guarantees no cached statistic
can drift out of sync with the raw data. It's O(n) and won't hold at millions of
rows — that's when you'd add incremental checkpoints.

**Multiplicity is handled bluntly.** 4 axes × 2 metrics = 8 simultaneous tests.
Each is always-valid in *time*, but that says nothing about looking across many
experiments at once — under a global null, the chance at least one fires would
be 34%, not 5%. I split the budget Bonferroni-style (α = 0.05/8 = 0.00625),
which is correct but conservative; a hierarchical or FDR approach would recover
power.

**Small effects may never resolve.** τ² is tuned for ~5-point differences. A
genuine 2.5-point gap can sit at "Too close to call" indefinitely. That's
correct behaviour, but it reads like "no difference exists" unless you know.

---

## The honest one-line summary

The method is sound and tested. Retention is simulated, the deck doesn't rotate
yet, and it isn't tamper-proof. What it demonstrates is that you can watch an
experiment continuously, stop the moment it's real, and not lie to yourself —
which the naive version of this gets wrong 39% of the time.
