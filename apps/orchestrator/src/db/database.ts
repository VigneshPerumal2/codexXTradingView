import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { createEmptyLedger, sampleDashboardState, type AgentEvent, type DailySummary, type DashboardState, type MarketSnapshot, type PaperLedger, type RiskLimits, type RiskResult, type StrategyDecision } from "@codex-tv/shared";
import { schemaSql } from "./schema.js";

type SqliteDatabase = Database.Database;
type Row = Record<string, unknown>;

export class TradingDatabase {
  readonly db: SqliteDatabase;

  constructor(databasePath: string, private readonly limits: RiskLimits) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(schemaSql);
    if (!this.loadLedger()) {
      this.saveLedger(createEmptyLedger(limits.startingCapital));
    }
  }

  close(): void {
    this.db.close();
  }

  recordSnapshot(snapshot: MarketSnapshot): void {
    this.db.prepare(`
      INSERT INTO market_snapshots (id, symbol, timeframe, price, timestamp, source, payload_json)
      VALUES (@id, @symbol, @timeframe, @price, @timestamp, @source, @payload)
      ON CONFLICT(id) DO UPDATE SET price = excluded.price, timestamp = excluded.timestamp, payload_json = excluded.payload_json
    `).run({ ...snapshot, payload: JSON.stringify(snapshot) });
  }

  recordDecision(decision: StrategyDecision): void {
    this.db.prepare(`
      INSERT INTO strategy_decisions (id, strategy_id, snapshot_id, mode, score, confidence, created_at, payload_json)
      VALUES (@id, @strategyId, @snapshotId, @mode, @score, @confidence, @createdAt, @payload)
      ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json
    `).run({ ...decision, payload: JSON.stringify(decision) });
  }

  recordRiskResult(result: RiskResult): void {
    this.db.prepare(`
      INSERT INTO risk_results (id, intent_id, snapshot_id, approved, created_at, payload_json)
      VALUES (@id, @intentId, @snapshotId, @approved, @createdAt, @payload)
      ON CONFLICT(id) DO UPDATE SET approved = excluded.approved, payload_json = excluded.payload_json
    `).run({ ...result, approved: result.approved ? 1 : 0, payload: JSON.stringify(result) });
  }

  recordAgentEvent(event: AgentEvent): void {
    this.db.prepare(`
      INSERT INTO agent_events (id, agent, level, message, created_at, payload_json)
      VALUES (@id, @agent, @level, @message, @createdAt, @payload)
      ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json
    `).run({ ...event, payload: JSON.stringify(event) });
  }

  recordSummary(summary: DailySummary): void {
    this.db.prepare(`
      INSERT INTO daily_summaries (id, kind, timezone, generated_at, payload_json)
      VALUES (@id, @kind, @timezone, @generatedAt, @payload)
      ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json
    `).run({ ...summary, payload: JSON.stringify(summary) });
  }

  recordWhatsAppDelivery(delivery: {
    id: string;
    summaryId: string;
    status: "sent" | "skipped" | "failed";
    provider: "twilio";
    providerMessageId?: string;
    error?: string;
    createdAt: string;
    payload: Record<string, unknown>;
  }): void {
    this.db.prepare(`
      INSERT INTO whatsapp_deliveries (id, summary_id, status, provider, provider_message_id, error, created_at, payload_json)
      VALUES (@id, @summaryId, @status, @provider, @providerMessageId, @error, @createdAt, @payloadJson)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, payload_json = excluded.payload_json
    `).run({
      ...delivery,
      providerMessageId: delivery.providerMessageId ?? null,
      error: delivery.error ?? null,
      payloadJson: JSON.stringify(delivery.payload)
    });
  }

  saveLedger(ledger: PaperLedger): void {
    this.db.prepare(`
      INSERT INTO ledger_state (id, updated_at, payload_json)
      VALUES ('default', @updatedAt, @payload)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, payload_json = excluded.payload_json
    `).run({ updatedAt: new Date().toISOString(), payload: JSON.stringify(ledger) });
  }

  loadLedger(): PaperLedger | null {
    const row = this.db.prepare("SELECT payload_json FROM ledger_state WHERE id = 'default'").get() as Row | undefined;
    return row?.payload_json ? JSON.parse(String(row.payload_json)) as PaperLedger : null;
  }

  setSystemState(key: string, value: string): void {
    this.db.prepare(`
      INSERT INTO system_state (key, value, updated_at)
      VALUES (@key, @value, @updatedAt)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run({ key, value, updatedAt: new Date().toISOString() });
  }

  getSystemState(key: string): string | null {
    const row = this.db.prepare("SELECT value FROM system_state WHERE key = ?").get(key) as Row | undefined;
    return row?.value ? String(row.value) : null;
  }

  loadDashboardState(): DashboardState {
    const ledger = this.loadLedger() ?? createEmptyLedger(this.limits.startingCapital);
    return {
      snapshots: this.readJsonRows<MarketSnapshot>("SELECT payload_json FROM market_snapshots ORDER BY timestamp DESC LIMIT 25", sampleDashboardState.snapshots),
      decisions: this.readJsonRows<StrategyDecision>("SELECT payload_json FROM strategy_decisions ORDER BY created_at DESC LIMIT 50", sampleDashboardState.decisions),
      riskResults: this.readJsonRows<RiskResult>("SELECT payload_json FROM risk_results ORDER BY created_at DESC LIMIT 50", sampleDashboardState.riskResults),
      ledger,
      agentEvents: this.readJsonRows<AgentEvent>("SELECT payload_json FROM agent_events ORDER BY created_at DESC LIMIT 100", sampleDashboardState.agentEvents),
      summaries: this.readJsonRows<DailySummary>("SELECT payload_json FROM daily_summaries ORDER BY generated_at DESC LIMIT 30", sampleDashboardState.summaries),
      limits: this.limits
    };
  }

  private readJsonRows<T>(sql: string, fallback: T[]): T[] {
    const rows = this.db.prepare(sql).all() as Row[];
    if (rows.length === 0) return fallback;
    return rows.map((row) => JSON.parse(String(row.payload_json)) as T);
  }
}
