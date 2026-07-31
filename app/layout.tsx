import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

/* One neo-grotesque throughout, differentiated by size and tracking rather
   than by mixing faces — the Swiss discipline the rest of the system follows.
   Geist is open source (SIL OFL) and sits close to the commercial grotesques
   this look is usually built on. */
const body = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

/* Mono — every number in the product, plus section labels. */
const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Swipe A/B — which way of writing a card gets backed",
  description:
    "A decision instrument for people who write financial swipe-cards. Tests framing patterns across the whole deck and tells you which one wins.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${mono.variable}`}
    >
      <body className="min-h-dvh">
        <Nav />
        {children}
        <footer className="mx-auto max-w-5xl px-5 pb-14 pt-12 sm:px-8">
          <div className="border-t pt-5 text-[11.5px] leading-relaxed t3">
            Every ticker, company and thesis in this product is fictional and
            exists only to give the experiment something to measure. Nothing
            here is investment advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
