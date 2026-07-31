"use client";

export interface DeckCard {
  id: string;
  ticker: string;
  company: string;
  sector: string;
  variant: "A" | "B";
  axis?: string;
  pole?: string;
  content: {
    thesis: string;
    catalyst: string;
    risk: string;
    sizing: string;
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div
        aria-hidden
        className="mt-[7px] h-[3px] w-3 shrink-0 rounded-full"
        style={{ background: "var(--line-strong)" }}
      />
      <div className="min-w-0">
        <div className="eyebrow">{label}</div>
        <p className="mt-1 text-[13.5px] leading-[1.45] t1">{value}</p>
      </div>
    </div>
  );
}

export default function StockCard({
  card,
  showVariant,
}: {
  card: DeckCard;
  showVariant: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-[4px] border"
      style={{ background: "var(--raised)", boxShadow: "var(--shadow-3)" }}
    >
      <div className="flex items-start justify-between gap-3 border-b px-5 pb-4 pt-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="num text-[26px] font-semibold leading-none">
              {card.ticker}
            </h2>
            {showVariant && card.pole && (
              <span
                className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: "var(--accent-wash)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                }}
              >
                {card.pole.replace(/-/g, " ")}
              </span>
            )}
          </div>
          <div className="mt-2 truncate text-[13px] t2">{card.company}</div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-medium t3"
          style={{ background: "var(--sunken)" }}
        >
          {card.sector}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-[18px] px-5 py-5">
        <Row label="Thesis" value={card.content.thesis} />
        <Row label="Catalyst" value={card.content.catalyst} />
        <Row label="Risk" value={card.content.risk} />
        <Row label="Sizing" value={card.content.sizing} />
      </div>

      <div
        className="border-t px-5 py-3 text-[10.5px] t3"
        style={{ background: "var(--sunken)" }}
      >
        Fictional company · illustrative only · not investment advice
      </div>
    </div>
  );
}
