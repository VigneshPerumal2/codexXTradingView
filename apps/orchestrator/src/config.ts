import { resolve } from "node:path";
import { createRiskLimits, type RiskLimits } from "@codex-tv/shared";

export interface OrchestratorConfig {
  rootDir: string;
  databasePath: string;
  redisUrl: string;
  tvCdpPort: number;
  timezone: string;
  paperMode: "paper" | "backtest";
  enableLiveBroker: false;
  snapshotIntervalMs: number;
  summaryCheckIntervalMs: number;
  riskLimits: RiskLimits;
  whatsapp: {
    enabled: boolean;
    accountSid?: string;
    authToken?: string;
    from?: string;
    to?: string;
    summaryTemplateSid?: string;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, rootDir = resolve(import.meta.dirname, "../../..")): OrchestratorConfig {
  if (env.ENABLE_LIVE_BROKER === "true") {
    throw new Error("ENABLE_LIVE_BROKER=true is not allowed in V1. This project is paper/simulated only.");
  }

  const paperMode = env.PAPER_TRADING_MODE === "backtest" ? "backtest" : "paper";
  const databasePath = resolve(rootDir, env.DATABASE_PATH ?? "./data/papertrading.sqlite");

  const whatsapp: OrchestratorConfig["whatsapp"] = {
    enabled: env.WHATSAPP_ENABLED === "true"
  };
  if (env.TWILIO_ACCOUNT_SID) whatsapp.accountSid = env.TWILIO_ACCOUNT_SID;
  if (env.TWILIO_AUTH_TOKEN) whatsapp.authToken = env.TWILIO_AUTH_TOKEN;
  if (env.TWILIO_WHATSAPP_FROM) whatsapp.from = env.TWILIO_WHATSAPP_FROM;
  if (env.WHATSAPP_TO) whatsapp.to = env.WHATSAPP_TO;
  if (env.TWILIO_SUMMARY_TEMPLATE_SID) whatsapp.summaryTemplateSid = env.TWILIO_SUMMARY_TEMPLATE_SID;

  return {
    rootDir,
    databasePath,
    redisUrl: env.REDIS_URL ?? "redis://127.0.0.1:6379",
    tvCdpPort: numberFromEnv(env.TV_CDP_PORT, 9333),
    timezone: env.SUMMARY_TIMEZONE ?? "America/Los_Angeles",
    paperMode,
    enableLiveBroker: false,
    snapshotIntervalMs: numberFromEnv(env.SNAPSHOT_INTERVAL_MS, 60_000),
    summaryCheckIntervalMs: numberFromEnv(env.SUMMARY_CHECK_INTERVAL_MS, 15 * 60_000),
    riskLimits: createRiskLimits({
      startingCapital: numberFromEnv(env.STARTING_CAPITAL, 100_000),
      maxDailyLossPct: numberFromEnv(env.MAX_DAILY_LOSS_PCT, 0.02),
      maxPositionNotionalPct: numberFromEnv(env.MAX_POSITION_NOTIONAL_PCT, 0.1),
      maxOpenPositions: numberFromEnv(env.MAX_OPEN_POSITIONS, 5),
      staleDataMs: numberFromEnv(env.STALE_DATA_MS, 60_000),
      slippageBps: numberFromEnv(env.SLIPPAGE_BPS, 5),
      feeBps: numberFromEnv(env.FEE_BPS, 1),
      killSwitch: env.KILL_SWITCH === "true",
      enforceMarketHours: env.ENFORCE_MARKET_HOURS === "true"
    }),
    whatsapp
  };
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
