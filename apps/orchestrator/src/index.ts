import { TwilioWhatsAppAdapter } from "./adapters/whatsapp.js";
import { TradingViewCliAdapter } from "./adapters/tradingview.js";
import { loadConfig } from "./config.js";
import { TradingDatabase } from "./db/database.js";
import { startBullMqScheduler, startLocalLoop } from "./queues/scheduler.js";
import { TradingViewPaperTradingOrchestrator } from "./services/orchestrator.js";

const config = loadConfig();
const database = new TradingDatabase(config.databasePath, config.riskLimits);
const tradingView = new TradingViewCliAdapter({ rootDir: config.rootDir, tvCdpPort: config.tvCdpPort });
const whatsapp = new TwilioWhatsAppAdapter(config.whatsapp);
const orchestrator = new TradingViewPaperTradingOrchestrator({ config, database, tradingView, whatsapp });

const args = new Set(process.argv.slice(2));

if (args.has("--once")) {
  await orchestrator.runCycle();
  database.close();
} else if (args.has("--summary")) {
  const summaryIndex = process.argv.indexOf("--summary");
  const kind = process.argv[summaryIndex + 1] === "evening" ? "evening" : "morning";
  await orchestrator.sendSummary(kind);
  database.close();
} else if (args.has("--local-loop")) {
  const handle = startLocalLoop(config, database, orchestrator);
  registerShutdown(async () => {
    await handle.close();
    database.close();
  });
  console.log(`Codex TradingView paper-trading local loop running on ${config.timezone}. Live broker disabled.`);
} else {
  const handle = await startBullMqScheduler(config, database, orchestrator);
  registerShutdown(async () => {
    await handle.close();
    database.close();
  });
  console.log(`Codex TradingView paper-trading scheduler running via BullMQ. Live broker disabled.`);
}

function registerShutdown(cleanup: () => Promise<void>): void {
  const shutdown = async () => {
    await cleanup();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}
