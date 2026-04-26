import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../config.js";

test("loadConfig refuses live broker mode", () => {
  assert.throws(() => loadConfig({ ENABLE_LIVE_BROKER: "true" } as NodeJS.ProcessEnv, process.cwd()), /not allowed/);
});

test("loadConfig defaults to paper mode on port 9333", () => {
  const config = loadConfig({} as NodeJS.ProcessEnv, process.cwd());
  assert.equal(config.paperMode, "paper");
  assert.equal(config.tvCdpPort, 9333);
  assert.equal(config.enableLiveBroker, false);
});
