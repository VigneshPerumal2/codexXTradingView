# Codex + TradingView MCP Setup

This workspace connects Codex to TradingView Desktop through the local `tradingview-mcp` bridge. It follows the desktop-control workflow from the video, with machine-specific hardening for this Mac.

It also includes a V1 local-first paper-trading operating system. V1 can run a research daemon, create simulated paper trades, persist a decision ledger, show a LiquidGlass-style dashboard, and generate 9am/9pm Pacific WhatsApp-ready summaries. It cannot place real-money trades.

## Current Setup

- TradingView Desktop is installed at `/Applications/TradingView.app`.
- The MCP bridge lives in `./tradingview-mcp`.
- Codex has a global `tradingview` MCP server configured in `~/.codex/config.toml`.
- This machine uses `TV_CDP_PORT=9333` because Chrome already listens on `9222`.
- The MCP server uses Node `v22.14.0`.
- Reusable Codex config examples live in `codex/config.example.toml` and `codex/rules/default.rules`.

## Daily Usage

```bash
./scripts/tv-launch-debug
./scripts/tv-health
./scripts/tv-cli quote
./scripts/tv-cli values
```

After changing MCP configuration, restart Codex so the tools reload.

## Paper-Trading OS

Install the workspace once:

```bash
npm install
```

Run the local paper daemon:

```bash
./scripts/paper-os
```

Run the dashboard:

```bash
./scripts/paper-dashboard
```

Generate a manual summary:

```bash
./scripts/paper-summary morning
./scripts/paper-summary evening
```

Production-style scheduling uses BullMQ + Redis:

```bash
redis-server
npm run orchestrator
```

The dashboard is served by Next.js at `http://localhost:3000` and starts with sample paper-trading data until the daemon writes fresh SQLite rows.

## Paper OS Architecture

- `apps/orchestrator`: Node/TypeScript daemon with TradingView read adapter, deterministic agents, BullMQ hooks, SQLite persistence, and Twilio WhatsApp delivery.
- `apps/dashboard`: Next.js LiquidGlass-inspired dashboard for overview, paper trades, hypothetical P&L, agent activity, decision ledger, risk console, strategy lab, daily summaries, and settings.
- `packages/shared`: shared types, risk rules, paper-fill simulation, P&L/drawdown math, and sample dashboard state.
- `data/papertrading.sqlite`: local V1 database, ignored by git.

The orchestrator agents are:

- `MarketDataAgent`: captures read-only TradingView snapshots through `scripts/tv-cli`.
- `StrategyAgent`: scores snapshots and emits paper-only trade intents.
- `RiskManagerAgent`: blocks/approves intents with deterministic limits.
- `PaperExecutionAgent`: turns approved intents into simulated fills only.
- `PerformanceAgent`: updates hypothetical equity, drawdown, and P&L metrics.
- `SummaryAgent`: creates 9am/9pm paper-trading research summaries from persisted ledger data.
- `SupervisorAgent`: records heartbeats, kill-switch state, and live-broker-disabled state.

## WhatsApp Summaries

WhatsApp delivery is disabled by default. To enable Twilio sandbox/template sends, copy `.env.example` to `.env`, set `WHATSAPP_ENABLED=true`, and fill the Twilio fields:

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_TO=whatsapp:+1...
TWILIO_SUMMARY_TEMPLATE_SID=
```

Messages use paper-safe language such as “paper-trading research summary.” They must not say “buy/sell now.”

## Verification

```bash
codex mcp list
codex mcp get tradingview
lsof -nP -iTCP:9222 -sTCP:LISTEN
lsof -nP -iTCP:9333 -sTCP:LISTEN
curl http://127.0.0.1:9333/json/version
./scripts/tv-health
./scripts/tv-cli state
./scripts/tv-cli quote
./scripts/tv-cli values
npm test
npm run typecheck
```

Expected state: `9222` may be Chrome, while `9333` should be TradingView.

Dependency audit notes are recorded in `docs/npm-audit-2026-04-24.md`. Do not run `npm audit fix --force` without reviewing dependency impact.

## Helper Scripts

- `scripts/tv-cli`: runs the TradingView MCP CLI with Node 22 and `TV_CDP_PORT=9333`.
- `scripts/tv-launch-debug`: launches TradingView with CDP enabled on `9333`.
- `scripts/tv-health`: runs read-only MCP health and chart-state checks.
- `scripts/tv-doctor`: prints setup diagnostics for app, ports, Codex MCP, CDP, and MCP health.
- `scripts/paper-os`: runs the local paper-trading daemon loop.
- `scripts/paper-dashboard`: starts the Next.js dashboard.
- `scripts/paper-summary`: generates a manual morning or evening paper summary.

## Safety Boundaries

This setup is for human-in-the-loop research, chart analysis, Pine Script development, and paper-trading research automation. V1 is not a live trading bot and cannot send real broker orders.

Real-money integration is a later gated phase only after at least 30 days of paper-forward logs, reproducible reports, no unexplained executions, passing risk-limit tests, and explicit manual approval.

Keep CDP on loopback only. Do not expose `9333` or `9222` to your LAN or the internet.

## Troubleshooting

- If MCP tools are missing, restart Codex and run `codex mcp list`.
- If `cdp_connected` is false, run `./scripts/tv-launch-debug`.
- If `9222` is busy, leave it alone; this setup intentionally uses `9333`.
- If Pine compile tests fail in the sandbox, rerun with network access or treat them as external-service dependent.
- If TradingView updates break launch behavior, check upstream PRs/issues in `tradesdontlie/tradingview-mcp`.
