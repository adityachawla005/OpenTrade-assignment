# EDGE

**A stock-market prediction game where the scarce resource isn't money — it's what you have room to remember.**

Interactive vision prototype. Next.js · TypeScript · Tailwind v4 · Framer Motion.
Client-only, no backend; the career persists in `localStorage`. Mobile-first.
Every company, ticker and price move is fictional; nothing here is investment
advice.

```
npm install && npm run dev     # http://localhost:3000
```

---

## The three systems

### 1. The Investor Brain — the playable core

Right calls pay **XP** and offer a **Fact** — a reusable principle tied to a
sector, not a tip about a stock.

The Brain is measured in **neurons** — one Fact, one neuron. Rookie has 5
against a 13-Fact deck, so you are leaving most of it behind from the very
first run; the top tier has 10. (The cost model is a single function, `neuronCost` in
`lib/elo.ts`, if Facts ever need to be priced differently.)

Three decisions make the loop:

**Save or skip.** Every earned Fact is asked about, not deposited — *is this
worth a neuron?* The keep screen shows what the Fact does, how many cards of its
sector are still in the deck, and your budget with the Fact previewed into it.
Saving indiscriminately fills your head with Facts for sectors that aren't
coming, which is the lesson.

**What to drop.** If it doesn't fit, you choose what to release, with the budget
tracking live and the trade blocked until it actually fits.

**What to play.** Facts never fire on their own. A card shows every held Fact
that matches its sector, with a soft pulse on the ones you haven't used, and
applying one is always a tap you make:

- **Read** — apply it to unlock a line of analysis before you call. Never runs out.
- **Hedge** — arm it to absorb a miss, or convert it to a life on a right call. Spent only if you arm it, so *which card you spend it on* is the decision.

Miss a match and nothing bad happens — the reveal just points out what was
playable. Assisted, never punished.

The deck order is load-bearing. **Every sector appears at least twice, never
back to back** — Semis 1/5/13, Energy 2/8, Retail 3/10, Biotech 4/9, Banks
6/11, Autos 7/12 — so no Fact is ever dead on arrival and save-or-skip is
always a judgement about *how much* a Fact is worth. The second card in each
sector is the mirror of the first: LOOMS punishes inventory outrunning sales,
MRSH rewards it collapsing. Holding the Fact isn't enough — you have to have
understood it.

Lives start at 3, cap at 5.

### 2. XP → Elo

**XP is the counter.** It only goes up, it's earned by playing, and it's what
raises the skill rating — the rating is downstream, not a second currency.

```
xp    = 5 (for the call) + [correct: 20 + 80 × crowdWrongShare] + streak bonus
Δ     = correct ?  round(skillXp × 0.5 × (1 − expected))
                : −round(40 × expected)
where opponent = 900 + crowdWrongShare × 700
      expected = 1 / (1 + 10^((opponent − rating)/400))
```

Each card is expressed as **an opponent whose rating is the share of the field
that got it wrong** — a card 20% of players miss is a ~1040 opponent, one 80%
miss is a ~1460 opponent. A contrarian-correct call pays ~85 XP and ~+35 rating;
agreeing with a consensus the crowd also got right pays ~45 XP and ~+10. Losses
stay pure Elo, so missing an easy card costs more than missing a hard one, and
the conversion shrinks as you climb — the self-correcting part of Elo, intact.
The reveal shows the whole chain: XP chips → `+87 XP → +37 rating`.

Tiers: **Rookie** 0 → **Analyst** 1100 → **Trader** 1250 → **Portfolio
Manager** 1400 → **Wall Street** 1550, at 5 / 6 / 7 / 8 / 10 neurons. You
start at 1060, so the first promotion lands inside the first session.

### 3. Tiered rewards

A badge, a card finish, eventually the Arena — **and more neurons**, which is
the reward that changes how the game plays.

Shown as a **horizontal reward track**: nodes on a rail, the filled part behind
you, each tier a card with its finish rendered as the thing it is (Matte →
Slate → Graphite → Gold → animated Prism). The ladder screen shows the same
progression as a **climb rail** — a real rating axis, so the gap to Wall Street
is visibly longer than the gap to Analyst, with your marker at your exact
rating.

---

## The career

A session is one deck. The **career** is the account, persisted in
`localStorage`:

- **XP, rating, peak** carry over.
- **Discovery is permanent.** Every Fact you've ever earned stays in your
  library forever — including ones you skipped or dropped.
- **Carrying is not.** Between sessions the **loadout** screen lets you fill
  your neuron budget from the whole library, against the deck you're about to
  play.

So rank never decides what you know — it decides how much of it fits in your
head at once. Reset from the summary screen.

## The flywheel

The promotion overlay is the argument, in the order it turns: XP → rating →
tier → the neuron row visibly grows → the Fact you just earned drops into the
room that just appeared.

## Layout

```
lib/
  cards.ts       13 cards + the Facts they pay, sector-ordered
  deck.ts        what's still ahead — the number every Fact is judged against
  elo.ts         XP model, rating conversion, tiers, neuron budget
  game.ts        the reducer — predict → reveal → promotion → keep → swap
  profile.ts     the persisted career
  opponents.ts   deterministic matched opponents
components/
  play/          card, HUD, corner Brain, reveal, keep, swap, promotion, loadout
  ladder/        XP, climb rail, bracket, session curve, the loop
  rewards/       reward track, library, Arena
```

## Design notes

Dark by construction — four accents and no more: `up` `#2ee6a8`, `down`
`#ff5f56`, `brain` `#7c8cff` for everything knowledge-related, `gold` `#f2b544`
for tiers only. Validated against the panel surface: all-pairs CVD ΔE 10.9,
normal-vision ΔE 19.6, contrast ≥3:1. Direction never relies on hue alone —
every instance carries a ▲/▼ glyph and the word. Read vs. hedge is separated by
form and label, not colour.
