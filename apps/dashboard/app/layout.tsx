import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codex x TradingView Paper OS",
  description: "Local-first paper-trading research dashboard for Codex and TradingView Desktop."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
