    # Swipe A/B

    **Finds which ways of writing a swipe card actually get backed — and refuses to call a winner until the data really says so.**

    ---

    ## The insight

    Testing one card against itself doesn't work in production. The deck rotates
    daily, so any single card gathers a few hundred swipes and then it's gone —
    never enough to tell a real difference from noise before the card disappears.

    So this tests **framing patterns** instead: risk-first vs upside-first,
    number-led vs story-led. Those persist across the rotation. Every card written
    in a given style feeds the same experiment, so signal accumulates every day no
    matter which tickers happen to be live — and what comes out is a reusable
    writing rule, not a fact about one stock.

    ## What you'll see

    Open the dashboard and you get one verdict per framing, in plain English:

    >  **Leading with the risk wins** — backed **40% more**
    > Across 4,500 swipes on 3 cards, cards that name the downside before the
    > opportunity got backed more.

    > **Too close to call**
    > Neither way of writing is pulling ahead. Keep collecting.

    Under each verdict is a **head-to-head** — the two styles pushing against each
    other, winner lit up, loser receding. Below that, a **"still around a week
    later"** panel, because getting backed isn't the same as being kept.

    And when those two disagree, it says so:

    >  **This one wins the swipe but loses the user.** Number-led gets backed
    > more, but fewer of those users are still around a week later. Worth a closer
    > look before you trust the swipe.

    That flag is the most useful thing on the page. A tool that only counted swipes
    would have told you to ship the worse option.

    **The swipe page** (`/`) is the input — swipe cards yourself and they land in the
    same experiment, live. **"Generate sample data"** fills the deck with simulated
    traffic so you can see a fully resolved board in seconds instead of waiting for
    real volume.

    ## Why it won't lie to you

    The obvious way to run an A/B test is to watch the dashboard and ship the moment
    one side pulls ahead. That's the trap. If you keep checking, random noise will
    eventually look like a winner — it's only a question of how long you stare.

    This uses a test built to be watched continuously. You can check it after every
    single swipe, stop the instant the result is real, and the error rate holds.

    Both were measured on identical data where **no real difference existed**:

    | | Called a fake winner |
    |---|---|
    | Naive method, checked continuously | **39%** of the time |
    | This method | **2%** |

    It doesn't just wait around, either — a genuine effect gets caught in a median of
    **453 swipes out of a 4,000 budget**. It stops early when the answer is real and
    holds out when it isn't. On the current board it correctly refuses to call
    *Punchy vs Hedged*, where the two styles genuinely perform identically.

    ## Honest about what's real

    This is a working demo of a method, not a production system. Being precise about
    which is which:

    **Real** — the statistical engine and its 38 tests, the framing aggregation
    (swipes genuinely pool by style across every card; verified against raw SQL),
    deterministic assignment, and copy-change detection that stops an edited card
    from silently polluting its own results.

    **Not real yet** — retention data is simulated (there's no follow-up pipeline, so
    your own swipes never affect that panel), the deck doesn't actually rotate, and
    there's no auth, so it isn't tamper-proof.

    **One caveat worth knowing:** retention is measured only among people who backed
    a card — and backing is exactly what the framing changes. So the "wins the swipe,
    loses the user" flag is a signal worth investigating, not proof of cause. The UI
    says so in those words.

    📄 **[LIMITATIONS.md](./LIMITATIONS.md)** — the full breakdown, written to be read
    before the demo rather than discovered after it.

    ## Run it locally

    ```bash
    npm install
    npm run dev     # http://localhost:3000
    npm test        # 38 tests, including the false-positive measurements above
    ```

    Then hit **Generate sample data** on the dashboard to see a resolved board.

    ## Where this goes

    **Close the loop** — feed the winning framings to an LLM that drafts tomorrow's
    cards in the styles that are actually working, so the test stops being a report
    and becomes a writing system.

    **Move the target** — optimise for retention and conversion rather than swipes.
    The "wins the swipe, loses the user" flag already shows why the swipe alone is
    the wrong thing to maximise.

    ---

    <details>
    <summary><strong>Technical notes</strong></summary>

    **The test** is an mSPRT (mixture Sequential Probability Ratio Test) producing an
    always-valid p-value — evaluable after every observation with no peeking penalty,
    because the mixture likelihood ratio is a non-negative martingale under the null
    and Ville's inequality bounds its supremum over the whole sequence. The
    derivation and the continuous-monitoring argument are commented in full in
    `lib/stats/msprt.ts`. A plain two-proportion z-test lives in `lib/stats/ztest.ts`,
    evaluated at the same cadence, so the dashboard can show the contrast concretely
    rather than assert it.

    **Multiplicity:** 4 axes × 2 metrics = 8 simultaneous tests. Always-valid protects
    against peeking *in time*, not against scanning many experiments at once, so the
    5% budget is split Bonferroni-style (α = 0.00625) — derived from the axis count,
    so adding an axis tightens it automatically instead of silently widening the
    family.

    **Pooling across cards is safe** because assignment is a 50/50 deterministic hash
    *within each card*. Both styles see the same card mix in the same proportion, so
    card-level appeal cancels rather than confounds.

    **Copy changes reset cleanly:** every swipe stores a hash of the copy that was on
    screen. Edit a card and its old swipes are excluded from the live verdict and
    archived visibly, instead of pooling two different treatments under one label.
    Whitespace-only edits don't trigger a reset.

    **Layout**

    ```
    lib/stats/msprt.ts       the engine — pure, incremental, heavily commented
    lib/stats/msprt.test.ts  Monte Carlo suites for false positives and power
    lib/axes.ts              the four framing axes as structured data
    lib/cards.ts             12 fictional cards, 3 per axis, + content hashing
    lib/aggregate.ts         pools swipes by (axis, pole) and runs the tests
    lib/assign.ts            deterministic variant assignment
    lib/db.ts                SQLite swipe log — the only source of truth
    ```

    Every number on the dashboard is derived by replaying the swipe log through the
    engine, so no cached statistic can drift out of sync with the raw data.

    Adding a framing axis needs only data: append it to `AXES` and tag cards with its
    two poles. The engine never sees an axis name.

    Stack: Next.js (App Router), TypeScript, Tailwind v4, SQLite (better-sqlite3),
    Framer Motion. Charts are hand-rolled SVG — no charting dependency.

    </details>

    ---

    *Every ticker, company and thesis in this project is fictional and exists only to
    give the experiment something to measure. Nothing here is investment advice.*
