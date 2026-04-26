import type { DailySummary, EquityPoint, PaperLedger, PerformanceSummary } from "./types.js";

export function summarizePerformance(ledger: PaperLedger, markPrices: Record<string, number> = {}): PerformanceSummary {
  const unrealizedPnl = ledger.positions.reduce((total, position) => {
    const mark = markPrices[position.symbol] ?? position.averageEntry;
    const pnl = position.side === "long" ? (mark - position.averageEntry) * position.quantity : (position.averageEntry - mark) * position.quantity;
    return total + pnl;
  }, 0);
  const equity = ledger.cash + unrealizedPnl;
  const closedTrades = ledger.trades.filter((trade) => trade.closedAt);
  const winners = closedTrades.filter((trade) => (trade.realizedPnl ?? 0) > 0);
  const totalPnl = equity - ledger.startingCapital;

  return {
    equity: roundMoney(equity),
    cash: roundMoney(ledger.cash),
    realizedPnl: roundMoney(ledger.realizedPnl),
    unrealizedPnl: roundMoney(unrealizedPnl),
    totalPnl: roundMoney(totalPnl),
    totalPnlPct: roundPct(totalPnl / ledger.startingCapital),
    maxDrawdownPct: calculateMaxDrawdownPct(ledger.equityCurve),
    winRatePct: closedTrades.length === 0 ? 0 : roundPct(winners.length / closedTrades.length),
    openPositions: ledger.positions.length,
    closedTrades: closedTrades.length
  };
}

export function calculateMaxDrawdownPct(points: EquityPoint[]): number {
  let peak = points[0]?.equity ?? 0;
  let maxDrawdown = 0;

  for (const point of points) {
    peak = Math.max(peak, point.equity);
    if (peak <= 0) continue;
    maxDrawdown = Math.max(maxDrawdown, (peak - point.equity) / peak);
  }

  return roundPct(maxDrawdown);
}

export function createDailySummary(input: {
  id: string;
  kind: DailySummary["kind"];
  timezone: string;
  generatedAt: string;
  ledger: PaperLedger;
  markPrices?: Record<string, number>;
}): DailySummary {
  const metrics = summarizePerformance(input.ledger, input.markPrices);
  const session = input.kind === "morning" ? "9am" : "9pm";
  const pnlWord = metrics.totalPnl >= 0 ? "up" : "down";

  return {
    id: input.id,
    kind: input.kind,
    timezone: input.timezone,
    generatedAt: input.generatedAt,
    headline: `${session} paper-trading research summary: equity ${formatCurrency(metrics.equity)} (${pnlWord} ${formatCurrency(Math.abs(metrics.totalPnl))}).`,
    body: [
      "This is a paper-trading research summary, not a buy/sell recommendation.",
      `Open paper positions: ${metrics.openPositions}. Closed paper trades: ${metrics.closedTrades}.`,
      `Realized P&L: ${formatCurrency(metrics.realizedPnl)}. Unrealized P&L: ${formatCurrency(metrics.unrealizedPnl)}.`,
      `Max drawdown: ${metrics.maxDrawdownPct.toFixed(2)}%. Win rate: ${metrics.winRatePct.toFixed(2)}%.`
    ].join(" "),
    metrics
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPct(value: number): number {
  return Math.round(value * 10_000) / 100;
}
