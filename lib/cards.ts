import type { Card, Fact, Sector } from "./types";

/**
 * Thirteen cards. Every company, ticker and price move here is invented.
 *
 * Every sector appears at least twice, and never back to back:
 *   Semis 1, 5, 13 · Energy 2, 8 · Retail 3, 10
 *   Biotech 4, 9   · Banks 6, 11 · Autos 7, 12
 *
 * That guarantee is load-bearing. No Fact is ever dead on arrival, so save-or-
 * skip is always a judgement about *how much* a Fact is worth rather than
 * whether it's worth anything at all — and a Fact earned early only pays if you
 * still hold it later.
 *
 * The second card in each sector is deliberately the mirror of the first: the
 * same principle, pointing the other way. LOOMS punishes inventory outrunning
 * sales, MRSH rewards it collapsing. Holding the Fact isn't enough — you have
 * to have understood it.
 */
export const CARDS: Card[] = [
  {
    id: "nvx",
    ticker: "NVX",
    company: "Nivara Systems",
    sector: "Semis",
    setup:
      "Nivara beats earnings by 12% and guides above the street. Tonight, its largest customer says it is designing its own chips in-house.",
    lines: ["Up 40% over three months", "That customer is 34% of revenue"],
    consensus: 0.71,
    truth: "DOWN",
    move: "−8.2%",
    because:
      "A beat is history — it was bought weeks before it printed. A top customer going in-house resets the forward revenue line, and the market only ever trades the forward line.",
    reward: {
      id: "f-priced-in",
      sector: "Semis",
      title: "Beats are already priced",
      detail:
        "By the time a semi beats, the beat was the consensus. Only news about future revenue moves the tape.",
      edge: "read",
      hint: "Ignore the quarter that just printed. Find the sentence about revenue that hasn't happened yet — that's the one being traded.",
      rarity: "Sharp",
    },
  },
  {
    id: "helv",
    ticker: "HELV",
    company: "Helvern Energy",
    sector: "Energy",
    setup:
      "A hurricane shuts roughly 20% of Gulf refining capacity for two weeks. Helvern's refineries are all inland and completely untouched.",
    lines: ["No Helvern asset in the storm path", "Gasoline inventories 9% below average"],
    consensus: 0.44,
    truth: "UP",
    move: "+6.9%",
    because:
      "A supply shock lifts the price of the product, not just the cost of the damage. Untouched capacity sells into a tighter market — the outage is a windfall for whoever is still running.",
    reward: {
      id: "f-survivor",
      sector: "Energy",
      title: "Shocks pay the survivor",
      detail:
        "When capacity goes offline, whoever is still online prints. Always ask who is left standing.",
      edge: "hedge",
      rarity: "Sharp",
    },
  },
  {
    id: "looms",
    ticker: "LOOMS",
    company: "Loomis & Co.",
    sector: "Retail",
    setup:
      "Loomis posts record holiday revenue and the press release leads with it. Buried on page four: returns hit 31% of orders, and inventory is up 44% year over year.",
    lines: ["Returns 31% of orders, up from 18%", "Inventory +44% against +19% sales"],
    consensus: 0.68,
    truth: "DOWN",
    move: "−11.4%",
    because:
      "Revenue is a headline; inventory is a confession. Goods piling up faster than they sell, while a third of them come back, means the next two quarters get discounted away.",
    reward: {
      id: "f-inventory",
      sector: "Retail",
      title: "Inventory tells the truth",
      detail:
        "In retail, compare inventory growth to sales growth. If stock is outrunning sales, the margin is already gone.",
      edge: "read",
      hint: "Skip the revenue line. Put inventory growth next to sales growth — if inventory is winning, the discounts are already written.",
      rarity: "Sharp",
    },
  },
  {
    id: "crya",
    ticker: "CRYA",
    company: "Cryan Bio",
    sector: "Biotech",
    setup:
      "Cryan's lead oncology drug misses its primary endpoint in Phase III. It hits two secondary endpoints. The company holds $1.4B in cash — more than its entire market cap.",
    lines: ["Two secondary endpoints hit", "Market cap $1.1B against $1.4B net cash"],
    consensus: 0.29,
    truth: "UP",
    move: "+18.6%",
    because:
      "Trading below net cash means the market has already priced the entire pipeline at zero. When there is nothing left to be disappointed by, any surviving signal is pure upside.",
    reward: {
      id: "f-priced-zero",
      sector: "Biotech",
      title: "Priced for zero",
      detail:
        "Below net cash, the pipeline is valued at nothing. The downside was spent before you arrived.",
      edge: "hedge",
      rarity: "Rare",
    },
  },
  {
    id: "arcs",
    ticker: "ARCS",
    company: "Arcadia Silicon",
    sector: "Semis",
    setup:
      "Arcadia misses on revenue and drops 9% pre-market. Then, on the call, management raises next-year bookings guidance by 30% on datacenter orders.",
    lines: ["Bookings guidance raised 30%", "Backlog now covers five quarters"],
    consensus: 0.55,
    truth: "UP",
    move: "+12.1%",
    because:
      "The miss is the quarter that already happened. Bookings are revenue you haven't earned yet — in semis that backlog is the only number that describes the future.",
    reward: {
      id: "f-backlog",
      sector: "Semis",
      title: "Backlog beats the print",
      detail:
        "Bookings describe next year. The print describes last quarter. Only one of them is still tradeable.",
      edge: "hedge",
      rarity: "Common",
    },
  },
  {
    id: "mrdn",
    ticker: "MRDN",
    company: "Meridian Trust",
    sector: "Banks",
    setup:
      "The central bank cuts rates by 50bp. Meridian is a regional lender whose loan book is 80% fixed-rate mortgages, funded almost entirely by floating-rate deposits.",
    lines: ["Assets: fixed, locked for years", "Funding: floating, reprices now"],
    consensus: 0.74,
    truth: "UP",
    move: "+5.1%",
    because:
      "A bank earns the spread between what it pays and what it collects. Fixed assets with floating funding means a cut lowers the cost and leaves the income alone — this is the rare card where the obvious answer is also the right one.",
    reward: {
      id: "f-spread",
      sector: "Banks",
      title: "Banks trade the spread",
      detail:
        "Never ask what rates did. Ask which side of the balance sheet reprices first.",
      edge: "read",
      hint: "Rates alone tell you nothing. Find which side reprices first — the side that moves fastest decides the margin.",
      rarity: "Common",
    },
  },
  {
    id: "vltr",
    ticker: "VLTR",
    company: "Voltra Motors",
    sector: "Autos",
    setup:
      "Voltra cuts prices 15% across the lineup. Orders triple within 48 hours and the stock pops 7% on the headline.",
    lines: ["Orders 3× in two days", "Gross margin was 11% before the cut"],
    consensus: 0.66,
    truth: "DOWN",
    move: "−9.7%",
    because:
      "A price cut that triples orders is a demand problem admitting itself out loud. Volume up, margin down — and the market pays for margin, not for units.",
    reward: {
      id: "f-margin",
      sector: "Autos",
      title: "Volume isn't margin",
      detail:
        "Units are a vanity number. Work out what the cut does to gross margin before you believe the pop.",
      edge: "read",
      hint: "Take the price cut off the gross margin before you react to the order book. Ask whether anything is left.",
      rarity: "Common",
    },
  },
  {
    id: "ptra",
    ticker: "PTRA",
    company: "Petra Fuels",
    sector: "Energy",
    setup:
      "OPEC surprises with a production cut and crude jumps 9% in a session. Petra is a refiner: it buys crude and sells gasoline.",
    lines: ["Crude +9%, gasoline futures +1%", "Only 20% of input cost hedged"],
    consensus: 0.63,
    truth: "DOWN",
    move: "−6.3%",
    because:
      "Refiners don't sell oil, they buy it. Crude spiking while gasoline stays put compresses the crack spread — the input got expensive and the output didn't follow.",
    reward: {
      id: "f-barrel",
      sector: "Energy",
      title: "Know which side of the barrel",
      detail:
        "Producers sell crude; refiners buy it. The same headline is a gift to one and a tax on the other.",
      edge: "read",
      hint: "Before you read the oil price, decide whether this company is buying the barrel or selling it. The answer flips the sign.",
      rarity: "Sharp",
    },
  },
  {
    id: "kelp",
    ticker: "KELP",
    company: "Kelvin Therapeutics",
    sector: "Biotech",
    setup:
      "The FDA approves Kelvin's rare-disease drug ahead of schedule. The stock has run 210% into the decision.",
    lines: ["Stock +210% over four months", "Peak sales estimate unchanged all year"],
    consensus: 0.77,
    truth: "DOWN",
    move: "−14.8%",
    because:
      "The approval was the trade, and the trade is over. A 210% run into a binary event means the good outcome was already bought — the sellers were waiting for the news to sell into.",
    reward: {
      id: "f-sell-news",
      sector: "Biotech",
      title: "Sell the news",
      detail:
        "Measure the run into the event. If the good outcome is already paid for, the good outcome is a top.",
      edge: "hedge",
      rarity: "Rare",
    },
  },
  {
    id: "mrsh",
    ticker: "MRSH",
    company: "Marsh & Vale",
    sector: "Retail",
    setup:
      "Marsh & Vale reports flat revenue and the stock is down 22% on the year. Inventory is down 31% while same-store sales are up 4%.",
    lines: ["Inventory −31%, sales +4%", "No new stores planned"],
    consensus: 0.31,
    truth: "UP",
    move: "+13.7%",
    because:
      "Flat revenue with inventory down a third means they sold the old stock at full price. Clean shelves going into a season is a margin story the revenue line reports last.",
    reward: {
      id: "f-shelves",
      sector: "Retail",
      title: "Clean shelves come first",
      detail:
        "Falling inventory against rising sales is the setup before a margin beat.",
      edge: "hedge",
      rarity: "Sharp",
    },
  },
  {
    id: "holb",
    ticker: "HOLB",
    company: "Holbrook Financial",
    sector: "Banks",
    setup:
      "The central bank raises rates 75bp. Holbrook's book is 85% fixed-rate mortgages written three years ago, funded by overnight deposits.",
    lines: ["Assets: fixed, locked for years", "Funding: overnight, reprices tonight"],
    consensus: 0.69,
    truth: "DOWN",
    move: "−10.6%",
    because:
      "Rate moves don't have a direction for banks, they have a side. Fixed assets funded by overnight money means the cost jumps tonight and the income can't follow for years.",
    reward: {
      id: "f-duration",
      sector: "Banks",
      title: "Duration is the risk",
      detail:
        "The danger isn't rates. It's the gap between how long assets are locked and how fast funding moves.",
      edge: "read",
      hint: "Measure the gap: how long are the assets locked, how fast does the funding reprice? The wider the gap, the harder a rate move lands.",
      rarity: "Rare",
    },
  },
  {
    id: "kast",
    ticker: "KAST",
    company: "Kastner Automotive",
    sector: "Autos",
    setup:
      "Kastner raises prices 8% and discontinues its cheapest model. Order volume falls 12% and the stock drops on the headline.",
    lines: ["Orders −12%, average price +8%", "Gross margin 11% → 17%"],
    consensus: 0.35,
    truth: "UP",
    move: "+11.2%",
    because:
      "Fewer cars at a much better price is more profit. They walked away from units they barely made money on — the market pays for margin, not volume, in both directions.",
    reward: {
      id: "f-fewer",
      sector: "Autos",
      title: "Fewer, better",
      detail:
        "Dropping unprofitable volume is a margin decision, not a demand problem. Read the mix, not the units.",
      edge: "hedge",
      rarity: "Sharp",
    },
  },
  {
    id: "sltc",
    ticker: "SLTC",
    company: "Siltech Micro",
    sector: "Semis",
    setup:
      "Siltech's fab yields fall to 61% and it cuts guidance. Meanwhile its only competitor has had a fire at its main plant and will be offline for six months.",
    lines: ["Yields 61%, down from 84%", "Only rival offline until Q3"],
    consensus: 0.34,
    truth: "UP",
    move: "+15.3%",
    because:
      "Bad yields matter when the customer has somewhere else to go. With the only alternative offline, a struggling supplier becomes the only supplier — pricing power arrives from outside the company.",
    reward: {
      id: "f-relative",
      sector: "Semis",
      title: "Supply is relative",
      detail:
        "A company is only as weak as its alternatives. Check the competitor before you judge the operator.",
      edge: "read",
      hint: "Don't grade this company on its own numbers. Look at what the customer's alternative is — if there isn't one, the numbers stop mattering.",
      rarity: "Rare",
    },
  },
];

/** Every Fact in the game. Facts are stored by id, so copy can change freely. */
export const ALL_FACTS: Fact[] = CARDS.map((c) => c.reward);
export const FACT_BY_ID = new Map<string, Fact>(
  ALL_FACTS.map((f) => [f.id, f]),
);

export const SECTORS: Sector[] = [
  "Semis",
  "Energy",
  "Retail",
  "Biotech",
  "Banks",
  "Autos",
];

/* Deck composition — what's still ahead — lives in `lib/deck.ts`. */
