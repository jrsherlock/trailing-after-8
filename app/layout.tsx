import type { Metadata } from "next";
import { Graduate, Barlow_Semi_Condensed, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const graduate = Graduate({
  variable: "--font-graduate",
  weight: "400",
  subsets: ["latin"],
});

const barlow = Barlow_Semi_Condensed({
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trailing After 8 — The Late-Inning Ledger",
  description:
    "Every MLB team's record when trailing after eight innings, updated all season. Who escapes, who folds, and how rare the ninth-inning comeback really is.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${graduate.variable} ${barlow.variable} ${splineMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
