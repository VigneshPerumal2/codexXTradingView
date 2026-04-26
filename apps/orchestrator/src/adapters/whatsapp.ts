import type { DailySummary } from "@codex-tv/shared";
import type { OrchestratorConfig } from "../config.js";

export interface WhatsAppDeliveryResult {
  id: string;
  summaryId: string;
  status: "sent" | "skipped" | "failed";
  provider: "twilio";
  providerMessageId?: string;
  error?: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export class TwilioWhatsAppAdapter {
  constructor(private readonly config: OrchestratorConfig["whatsapp"]) {}

  async sendSummary(summary: DailySummary): Promise<WhatsAppDeliveryResult> {
    const id = `whatsapp_${summary.id}_${Date.now()}`;
    const createdAt = new Date().toISOString();

    if (!this.config.enabled) {
      return this.delivery(id, summary.id, "skipped", createdAt, { reason: "WHATSAPP_ENABLED is not true." });
    }

    if (!this.config.accountSid || !this.config.authToken || !this.config.from || !this.config.to) {
      return this.delivery(id, summary.id, "skipped", createdAt, { reason: "Twilio WhatsApp credentials or destination are missing." });
    }

    try {
      const { default: twilio } = await import("twilio");
      const client = twilio(this.config.accountSid, this.config.authToken);
      const message = await client.messages.create(this.createMessage(summary));

      return this.delivery(id, summary.id, "sent", createdAt, {
        providerMessageId: message.sid,
        to: this.config.to,
        template: Boolean(this.config.summaryTemplateSid)
      });
    } catch (error) {
      return this.delivery(id, summary.id, "failed", createdAt, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  createMessage(summary: DailySummary): { from: string; to: string; body?: string; contentSid?: string; contentVariables?: string } {
    const safeBody = `${summary.headline}\n\n${summary.body}`;
    if (this.config.summaryTemplateSid) {
      return {
        from: this.config.from ?? "",
        to: this.config.to ?? "",
        contentSid: this.config.summaryTemplateSid,
        contentVariables: JSON.stringify({
          "1": summary.headline,
          "2": summary.body
        })
      };
    }

    return {
      from: this.config.from ?? "",
      to: this.config.to ?? "",
      body: safeBody
    };
  }

  private delivery(id: string, summaryId: string, status: WhatsAppDeliveryResult["status"], createdAt: string, payload: Record<string, unknown>): WhatsAppDeliveryResult {
    const result: WhatsAppDeliveryResult = {
      id,
      summaryId,
      status,
      provider: "twilio",
      createdAt,
      payload
    };
    if (typeof payload.providerMessageId === "string") result.providerMessageId = payload.providerMessageId;
    if (typeof payload.error === "string") result.error = payload.error;
    return result;
  }
}

export function shouldPauseWhatsAppFromInbound(message: string): boolean {
  return /^(stop|pause|unsubscribe|cancel)\b/i.test(message.trim());
}
