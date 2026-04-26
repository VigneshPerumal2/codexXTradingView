import { createDailySummary, type DailySummary } from "@codex-tv/shared";
import type { TwilioWhatsAppAdapter } from "../adapters/whatsapp.js";
import type { TradingDatabase } from "../db/database.js";

export class SummaryAgent {
  readonly name = "SummaryAgent" as const;

  constructor(private readonly database: TradingDatabase, private readonly whatsapp: TwilioWhatsAppAdapter, private readonly timezone: string) {}

  async run(kind: DailySummary["kind"]): Promise<DailySummary | null> {
    const ledger = this.database.loadLedger();
    if (!ledger) return null;

    const generatedAt = new Date().toISOString();
    const summary = createDailySummary({
      id: `summary_${kind}_${dedupeDate(generatedAt, this.timezone)}`,
      kind,
      timezone: this.timezone,
      generatedAt,
      ledger
    });

    this.database.recordSummary(summary);
    const delivery = await this.whatsapp.sendSummary(summary);
    this.database.recordWhatsAppDelivery(delivery);
    this.database.recordAgentEvent({
      id: `event_summary_${Date.now()}`,
      agent: this.name,
      level: delivery.status === "failed" ? "error" : "info",
      message: `Generated ${kind} paper-trading summary; WhatsApp delivery ${delivery.status}.`,
      createdAt: generatedAt,
      metadata: { summaryId: summary.id, deliveryStatus: delivery.status }
    });

    return summary;
  }
}

function dedupeDate(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
