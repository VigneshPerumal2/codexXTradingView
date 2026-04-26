import assert from "node:assert/strict";
import test from "node:test";
import { getSummaryDedupeKey, getSummaryDueKind } from "../queues/scheduler.js";

test("getSummaryDueKind schedules 9am and 9pm Pacific summaries", () => {
  assert.equal(getSummaryDueKind(new Date("2026-04-24T16:00:00.000Z"), "America/Los_Angeles"), "morning");
  assert.equal(getSummaryDueKind(new Date("2026-04-25T04:00:00.000Z"), "America/Los_Angeles"), "evening");
  assert.equal(getSummaryDueKind(new Date("2026-04-24T16:30:00.000Z"), "America/Los_Angeles"), null);
});

test("getSummaryDedupeKey creates one key per local day and kind", () => {
  assert.equal(getSummaryDedupeKey("morning", new Date("2026-04-24T16:00:00.000Z"), "America/Los_Angeles"), "summary:morning:2026-04-24");
});
