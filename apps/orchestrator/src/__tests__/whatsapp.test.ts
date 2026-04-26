import assert from "node:assert/strict";
import test from "node:test";
import { createDailySummary, createEmptyLedger } from "@codex-tv/shared";
import { shouldPauseWhatsAppFromInbound, TwilioWhatsAppAdapter } from "../adapters/whatsapp.js";

test("Twilio adapter skips delivery unless WhatsApp is enabled", async () => {
  const adapter = new TwilioWhatsAppAdapter({ enabled: false });
  const summary = createDailySummary({
    id: "summary_test",
    kind: "morning",
    timezone: "America/Los_Angeles",
    generatedAt: "2026-04-24T16:00:00.000Z",
    ledger: createEmptyLedger(100_000)
  });

  const result = await adapter.sendSummary(summary);
  assert.equal(result.status, "skipped");
});

test("STOP and PAUSE inbound commands are recognized", () => {
  assert.equal(shouldPauseWhatsAppFromInbound("STOP"), true);
  assert.equal(shouldPauseWhatsAppFromInbound("pause please"), true);
  assert.equal(shouldPauseWhatsAppFromInbound("status"), false);
});
