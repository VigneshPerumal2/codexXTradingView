import type { AgentEvent, RiskLimits } from "@codex-tv/shared";
import type { TradingDatabase } from "../db/database.js";

export class SupervisorAgent {
  readonly name = "SupervisorAgent" as const;

  constructor(private readonly database: TradingDatabase, private readonly limits: RiskLimits) {}

  run(): void {
    this.database.recordAgentEvent({
      id: `event_supervisor_${Date.now()}`,
      agent: this.name,
      level: this.limits.killSwitch ? "warning" : "info",
      message: this.limits.killSwitch ? "Kill switch is active; paper fills are blocked." : "Supervisor heartbeat ok; V1 remains paper-only.",
      createdAt: new Date().toISOString(),
      metadata: {
        killSwitch: this.limits.killSwitch,
        liveBroker: "disabled"
      }
    } satisfies AgentEvent);
  }
}
