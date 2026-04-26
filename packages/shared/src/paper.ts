import type { MarketSnapshot, PaperFill, PaperLedger, PaperOrder, PaperPosition, PaperTrade, RiskLimits, RiskResult, TradeIntent } from "./types.js";

export function createEmptyLedger(startingCapital: number, timestamp = new Date().toISOString()): PaperLedger {
  return {
    cash: startingCapital,
    startingCapital,
    realizedPnl: 0,
    positions: [],
    trades: [],
    fills: [],
    equityCurve: [
      {
        timestamp,
        equity: startingCapital,
        cash: startingCapital,
        realizedPnl: 0,
        unrealizedPnl: 0
      }
    ],
    seenIntentIds: []
  };
}

export function createPaperOrder(intent: TradeIntent, risk: RiskResult): PaperOrder {
  const rejected = !risk.approved;
  const order: PaperOrder = {
    id: `order_${intent.id}`,
    intentId: intent.id,
    snapshotId: intent.snapshotId,
    status: rejected ? "rejected" : "approved",
    symbol: intent.symbol,
    side: intent.side,
    action: intent.action,
    quantity: intent.quantity,
    createdAt: intent.timestamp,
    mode: intent.mode
  };

  if (rejected) {
    order.rejectedAt = risk.createdAt;
    order.rejectionReason = risk.reasons.join(" ");
  } else {
    order.approvedAt = risk.createdAt;
  }

  return order;
}

export function createPaperFill(order: PaperOrder, intent: TradeIntent, snapshot: MarketSnapshot, limits: RiskLimits): PaperFill {
  const direction = fillPriceDirection(intent);
  const fillPrice = roundMoney(snapshot.price * (1 + direction * limits.slippageBps / 10_000));
  const notional = roundMoney(Math.abs(fillPrice * intent.quantity));
  const fee = roundMoney(notional * limits.feeBps / 10_000);

  return {
    id: `fill_${order.id}`,
    orderId: order.id,
    intentId: intent.id,
    snapshotId: snapshot.id,
    symbol: intent.symbol,
    side: intent.side,
    action: intent.action,
    quantity: intent.quantity,
    referencePrice: snapshot.price,
    fillPrice,
    slippageBps: limits.slippageBps,
    fee,
    notional,
    filledAt: new Date().toISOString(),
    assumptions: [
      "Simulated paper fill only; no broker order was sent.",
      `Applied ${limits.slippageBps} bps slippage and ${limits.feeBps} bps fee assumptions.`,
      "Fill assumes enough liquidity at the modeled price."
    ]
  };
}

export function applyPaperFill(ledger: PaperLedger, intent: TradeIntent, fill: PaperFill, markPrice = fill.fillPrice): PaperLedger {
  const positions = ledger.positions.map((position) => ({ ...position }));
  const trades = ledger.trades.map((trade) => ({ ...trade }));
  let cash = ledger.cash;
  let realizedPnl = ledger.realizedPnl;

  if (intent.action === "open") {
    const existing = positions.find((position) => position.symbol === intent.symbol && position.side === intent.side);
    if (existing) {
      const combinedQuantity = existing.quantity + intent.quantity;
      existing.averageEntry = roundMoney((existing.averageEntry * existing.quantity + fill.fillPrice * intent.quantity) / combinedQuantity);
      existing.quantity = combinedQuantity;
      existing.updatedAt = fill.filledAt;
      existing.snapshotId = fill.snapshotId;
    } else {
      positions.push({
        id: `position_${intent.symbol}_${intent.side}_${fill.filledAt}`,
        symbol: intent.symbol,
        side: intent.side,
        quantity: intent.quantity,
        averageEntry: fill.fillPrice,
        openedAt: fill.filledAt,
        updatedAt: fill.filledAt,
        strategyId: intent.strategyId,
        snapshotId: fill.snapshotId
      });
    }

    trades.push({
      id: `trade_${intent.id}`,
      symbol: intent.symbol,
      side: intent.side,
      quantity: intent.quantity,
      entryPrice: fill.fillPrice,
      openedAt: fill.filledAt,
      fees: fill.fee,
      strategyId: intent.strategyId,
      mode: intent.mode
    });
    cash -= fill.fee;
  } else {
    const positionIndex = positions.findIndex((position) => position.symbol === intent.symbol && position.side === intent.side);
    const position = positions[positionIndex];
    if (!position) return ledger;

    const closedQuantity = Math.min(position.quantity, intent.quantity);
    const pnl = roundMoney(calculatePositionPnl(position.side, position.averageEntry, fill.fillPrice, closedQuantity) - fill.fee);
    realizedPnl += pnl;
    cash += pnl;

    const openTrade = trades.find((trade) => trade.symbol === intent.symbol && trade.side === intent.side && !trade.closedAt);
    if (openTrade) {
      openTrade.exitPrice = fill.fillPrice;
      openTrade.closedAt = fill.filledAt;
      openTrade.realizedPnl = pnl;
      openTrade.fees = roundMoney(openTrade.fees + fill.fee);
    }

    position.quantity = roundQuantity(position.quantity - closedQuantity);
    position.updatedAt = fill.filledAt;
    if (position.quantity <= 0) positions.splice(positionIndex, 1);
  }

  const unrealizedPnl = positions.reduce((total, position) => total + calculatePositionPnl(position.side, position.averageEntry, markPrice, position.quantity), 0);
  const equity = roundMoney(cash + unrealizedPnl);

  return {
    cash: roundMoney(cash),
    startingCapital: ledger.startingCapital,
    realizedPnl: roundMoney(realizedPnl),
    positions: positions.map((position) => ({
      ...position,
      unrealizedPnl: roundMoney(calculatePositionPnl(position.side, position.averageEntry, markPrice, position.quantity))
    })),
    trades,
    fills: [...ledger.fills, fill],
    equityCurve: [
      ...ledger.equityCurve,
      {
        timestamp: fill.filledAt,
        equity,
        cash: roundMoney(cash),
        realizedPnl: roundMoney(realizedPnl),
        unrealizedPnl: roundMoney(unrealizedPnl)
      }
    ],
    seenIntentIds: [...new Set([...ledger.seenIntentIds, intent.id])]
  };
}

export function calculatePositionPnl(side: "long" | "short", entryPrice: number, markPrice: number, quantity: number): number {
  const gross = side === "long" ? (markPrice - entryPrice) * quantity : (entryPrice - markPrice) * quantity;
  return roundMoney(gross);
}

function fillPriceDirection(intent: TradeIntent): number {
  if (intent.action === "open") return intent.side === "long" ? 1 : -1;
  return intent.side === "long" ? -1 : 1;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
