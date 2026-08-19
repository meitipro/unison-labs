/**
 * The shell: fonts, the grain, and the wallet.
 *
 * There is no header or footer here. Nocturne gives the site a floating pill
 * nav over the hero and the dApp a sidebar, so each route draws its own.
 *
 * THE FONTS ARE LOCAL. The design links Inter, IBM Plex Mono and DotGothic16
 * from Google Fonts, plus BubbledotICG-FinePos from onlinewebfonts. Neither is
 * fetched here: a font host is a third party the page would have to reach at
 * paint time, and the proprietary face is not ours to redistribute. DotGothic16
 * is the design's own declared fallback for it, so the dotted display face is
 * what the design asked for either way.
 */

import type { Metadata } from "next";
import localFont from "next/font/local";

import { WalletProvider } from "../lib/wallet";
import * as copy from "../lib/copy";

import "./globals.css";

/** Inter. Everything read in sentences. */
const sans = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--sans",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

/** DotGothic16. The dotted display face, headline only. */
const display = localFont({
  src: "./fonts/dotgothic16-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--display",
  fallback: ["ui-monospace", "monospace"],
});

/** IBM Plex Mono. Labels, hashes, marks, addresses. */
const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--mono",
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: copy.PAGE_TITLE,
  description: copy.META_DESCRIPTION,
  icons: { icon: [{ url: "/mark.svg", type: "image/svg+xml" }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <div className="grain" aria-hidden="true" />
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
