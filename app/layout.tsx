import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/* One neo-grotesque for everything, with the mono reserved for figures and
   micro-labels. Numbers are the substance of this product — they get their own
   face so they read as instrumentation. */
const body = Geist({ subsets: ["latin"], display: "swap", variable: "--font-body" });
const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-face",
});

export const metadata: Metadata = {
  title: "EDGE — the market game where knowledge is a resource",
  description:
    "Call the market, earn Facts, and fight for room in a Brain that can't hold everything. XP buys rating, rating buys neurons, neurons buy depth.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#08090c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
