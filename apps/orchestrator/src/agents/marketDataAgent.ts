import type { AgentEvent, MarketSnapshot } from "@codex-tv/shared";
import type { TradingViewCliAdapter } from "../adapters/tradingview.js";
import type { TradingDatabase } from "../db/database.js";

export class MarketDataAgent {
  readonly name = "MarketDataAgent" as const;

  constructor(private readonly adapter: TradingViewCliAdapter, private readonly database: TradingDatabase) {}

  async run(): Promise<MarketSnapshot | null> {
    try {
      const snapshot = await this.adapter.captureSnapshot();
      this.database.recordSnapshot(snapshot);
      this.event("info", `Captured ${snapshot.symbol} ${snapshot.timeframe} snapshot from TradingView.`, { snapshotId: snapshot.id });
      return snapshot;
    } catch (error) {
      this.event("error", "TradingView snapshot capture failed; no paper decision will be made for this cycle.", {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private event(level: AgentEvent["level"], message: string, metadata?: Record<string, unknown>): void {
    const event: AgentEvent = {
      id: `event_market_${Date.now()}`,
      agent: this.name,
      level,
      message,
      createdAt: new Date().toISOString()
    };
    if (metadata) event.metadata = metadata;
    this.database.recordAgentEvent(event);
  }
}
