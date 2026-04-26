import type { DailySummary } from "@codex-tv/shared";
import type { TwilioWhatsAppAdapter } from "../adapters/whatsapp.js";
import type { TradingViewCliAdapter } from "../adapters/tradingview.js";
import { MarketDataAgent } from "../agents/marketDataAgent.js";
import { PaperExecutionAgent } from "../agents/paperExecutionAgent.js";
import { PerformanceAgent } from "../agents/performanceAgent.js";
import { RiskManagerAgent } from "../agents/riskManagerAgent.js";
import { StrategyAgent } from "../agents/strategyAgent.js";
import { SummaryAgent } from "../agents/summaryAgent.js";
import { SupervisorAgent } from "../agents/supervisorAgent.js";
import type { OrchestratorConfig } from "../config.js";
import type { TradingDatabase } from "../db/database.js";

export class TradingViewPaperTradingOrchestrator {
  private readonly marketDataAgent: MarketDataAgent;
  private readonly strategyAgent: StrategyAgent;
  private readonly riskManagerAgent: RiskManagerAgent;
  private readonly paperExecutionAgent: PaperExecutionAgent;
  private readonly performanceAgent: PerformanceAgent;
  private readonly summaryAgent: SummaryAgent;
  private readonly supervisorAgent: SupervisorAgent;

  constructor(input: {
    config: OrchestratorConfig;
    database: TradingDatabase;
    tradingView: TradingViewCliAdapter;
    whatsapp: TwilioWhatsAppAdapter;
  }) {
    this.marketDataAgent = new MarketDataAgent(input.tradingView, input.database);
    this.strategyAgent = new StrategyAgent(input.database, input.config.paperMode);
    this.riskManagerAgent = new RiskManagerAgent(input.database, input.config.riskLimits);
    this.paperExecutionAgent = new PaperExecutionAgent(input.database, input.config.riskLimits);
    this.performanceAgent = new PerformanceAgent(input.database);
    this.summaryAgent = new SummaryAgent(input.database, input.whatsapp, input.config.timezone);
    this.supervisorAgent = new SupervisorAgent(input.database, input.config.riskLimits);
  }

  async runCycle(): Promise<void> {
    this.supervisorAgent.run();
    const snapshot = await this.marketDataAgent.run();
    if (!snapshot) return;

    const decision = this.strategyAgent.run(snapshot);
    if (!decision.intent) {
      this.performanceAgent.run();
      return;
    }

    const risk = this.riskManagerAgent.run(decision.intent, snapshot);
    this.paperExecutionAgent.run(decision.intent, risk, snapshot);
    this.performanceAgent.run();
  }

  async sendSummary(kind: DailySummary["kind"]): Promise<DailySummary | null> {
    return this.summaryAgent.run(kind);
  }
}
