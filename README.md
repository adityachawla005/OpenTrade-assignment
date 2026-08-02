# 1. The Investor Brain — the playable core

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

Holding the Fact isn't enough — you have to have
understood it.



Tiers: **Rookie** 0 → **Analyst** 1100 → **Trader** 1250 → **Portfolio
Manager** 1400 → **Wall Street** 1550, at 5 / 6 / 7 / 8 / 10 neurons. You
start at 1060, so the first promotion lands inside the first session.


# Can be used with OpenTrade games like Runway,News or Higher/Lower