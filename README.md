# Swipe A/B

**Finds which ways of writing a swipe card actually get backed — and refuses to call a winner until the data really says so.**

---

## The insight

Testing one card against itself doesn't work: the deck rotates daily, so a card
gathers a few hundred swipes and then it's gone — never enough to tell a real
difference from noise.

So this tests **framing patterns** instead — risk-first vs upside-first,
number-led vs story-led. Those persist across the rotation, so every card feeds
the same experiment, and what comes out is a reusable writing rule rather than a
fact about one stock.

## What you'll see

One verdict per framing, in plain English:

> ✅ **Leading with the risk wins** — backed **45% more**
> Across 4,500 swipes on 3 cards.

> ⏳ **Too close to call** — neither way of writing is pulling ahead.

Under each is a head-to-head of the two styles, then a **"still around a week
later"** panel — because getting backed isn't the same as being kept. When those
two disagree, it says so:

> ⚠️ **This one wins the swipe but loses the user.** Number-led gets backed
> more, but fewer of those users stick around.

That flag is the most useful thing on the page. A tool that only counted swipes
would have told you to ship the worse option.

Swipe cards yourself on `/` and they land in the experiment live. **Generate
sample data** fills the deck so you can see a resolved board in seconds.

## Why it won't lie to you

Watch any normal A/B test long enough and noise will eventually look like a
winner. This uses a test built to be watched continuously — check it after every
swipe, stop the moment the result is real, and the error rate holds.

Measured on identical data where **no real difference existed**:

| | Called a fake winner |
|---|---|
| Naive method, checked continuously | **39%** |
| This method | **2%** |

It still moves fast: a genuine effect is caught in a median of **453 swipes out
of a 4,000 budget**.

## What's real

**Real** — the engine and its 38 tests, the framing aggregation, deterministic
assignment, and copy-change detection that stops an edited card from polluting
its own results.

**Not yet** — retention is simulated, the deck doesn't actually rotate, and
there's no auth.

One caveat: retention is measured only among people who backed a card, and
backing is what the framing changes — so the "loses the user" flag is a signal
worth investigating, not proof of cause. The UI says so.

📄 **[LIMITATIONS.md](./LIMITATIONS.md)** — the full breakdown.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 38 tests, including the numbers above
```

## Where this goes

**Close the loop** — feed winning framings to an LLM that drafts tomorrow's
cards in the styles that work.

**Move the target** — optimise for retention and conversion, not swipes.

---

<details>
<summary><strong>Technical notes</strong></summary>

**The test** is an mSPRT producing an always-valid p-value: evaluable after every
observation with no peeking penalty, because the mixture likelihood ratio is a
non-negative martingale under the null and Ville's inequality bounds its
supremum. Derivation is commented in `lib/stats/msprt.ts`. A plain two-proportion
z-test in `lib/stats/ztest.ts` runs at the same cadence so the dashboard can show
the contrast rather than assert it.

**Multiplicity:** 4 axes × 2 metrics = 8 simultaneous tests. Always-valid protects
against peeking in time, not against scanning many experiments at once, so the 5%
budget is split Bonferroni-style (α = 0.00625), derived from the axis count.

**Pooling across cards is safe** because assignment is a 50/50 deterministic hash
*within each card* — both styles see the same card mix, so card appeal cancels
rather than confounds.

**Copy changes reset cleanly:** every swipe stores a hash of the copy on screen.
Edit a card and its old swipes are archived visibly instead of pooling two
treatments under one label. Whitespace-only edits don't trigger it.

**Storage is in-memory**, not a database — serverless filesystems are read-only,
so the swipe log lives in module scope and auto-seeds on a cold start. A deployed
instance always serves a populated board; data resets when the instance recycles.

```
lib/stats/msprt.ts       the engine — pure, incremental
lib/stats/msprt.test.ts  Monte Carlo suites for false positives and power
lib/axes.ts              the four framing axes as structured data
lib/cards.ts             12 fictional cards, 3 per axis, + content hashing
lib/aggregate.ts         pools swipes by (axis, pole) and runs the tests
lib/db.ts                in-memory swipe log — the only source of truth
```

Every dashboard number is derived by replaying the log, so no cached statistic
can drift. Adding an axis needs only data: append to `AXES` and tag cards — the
engine never sees an axis name.

Next.js (App Router), TypeScript, Tailwind v4, Framer Motion. No database and no
native modules. Charts are hand-rolled SVG.

</details>

---

*All tickers, companies and theses are fictional. Nothing here is investment advice.*
