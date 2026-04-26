import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import type { DailySummary } from "@codex-tv/shared";
import type { OrchestratorConfig } from "../config.js";
import type { TradingDatabase } from "../db/database.js";
import type { TradingViewPaperTradingOrchestrator } from "../services/orchestrator.js";

export interface SchedulerHandle {
  close(): Promise<void>;
}

export async function startBullMqScheduler(config: OrchestratorConfig, database: TradingDatabase, orchestrator: TradingViewPaperTradingOrchestrator): Promise<SchedulerHandle> {
  const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue("codex-tv-paper-trading", { connection });

  const worker = new Worker("codex-tv-paper-trading", async (job) => {
    if (job.name === "run-cycle") {
      await orchestrator.runCycle();
      return;
    }

    if (job.name === "summary-check") {
      const kind = getSummaryDueKind(new Date(), config.timezone);
      if (!kind) return;
      const key = getSummaryDedupeKey(kind, new Date(), config.timezone);
      if (database.getSystemState(key)) return;
      await orchestrator.sendSummary(kind);
      database.setSystemState(key, "sent");
    }
  }, { connection, concurrency: 1 });

  await queue.upsertJobScheduler("market-snapshot-loop", { every: config.snapshotIntervalMs }, {
    name: "run-cycle",
    data: {},
    opts: { removeOnComplete: 100, removeOnFail: 1000 }
  });
  await queue.upsertJobScheduler("summary-check-loop", { every: config.summaryCheckIntervalMs }, {
    name: "summary-check",
    data: {},
    opts: { removeOnComplete: 100, removeOnFail: 1000 }
  });

  return {
    async close() {
      await worker.close();
      await queue.close();
      await connection.quit();
    }
  };
}

export function startLocalLoop(config: OrchestratorConfig, database: TradingDatabase, orchestrator: TradingViewPaperTradingOrchestrator): SchedulerHandle {
  const cycleTimer = setInterval(() => {
    void orchestrator.runCycle();
  }, config.snapshotIntervalMs);
  const summaryTimer = setInterval(() => {
    const now = new Date();
    const kind = getSummaryDueKind(now, config.timezone);
    if (!kind) return;
    const key = getSummaryDedupeKey(kind, now, config.timezone);
    if (database.getSystemState(key)) return;
    void orchestrator.sendSummary(kind).then(() => database.setSystemState(key, "sent"));
  }, config.summaryCheckIntervalMs);

  void orchestrator.runCycle();

  return {
    async close() {
      clearInterval(cycleTimer);
      clearInterval(summaryTimer);
    }
  };
}

export function getSummaryDueKind(date: Date, timezone: string): DailySummary["kind"] | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour ?? "0");
  const minute = Number(values.minute ?? "0");
  if (minute !== 0) return null;
  if (hour === 9) return "morning";
  if (hour === 21) return "evening";
  return null;
}

export function getSummaryDedupeKey(kind: DailySummary["kind"], date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `summary:${kind}:${values.year}-${values.month}-${values.day}`;
}
