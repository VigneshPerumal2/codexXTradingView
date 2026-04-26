# Codex TradingView MCP Instructions

## Purpose

This workspace is configured for Codex to control the local TradingView Desktop app through `tradingview-mcp` and Chrome DevTools Protocol on loopback only.

Use this setup for human-in-the-loop chart analysis, Pine Script development, screenshots, layout inspection, local workflow automation, and paper-trading research automation. Do not treat tool output as financial advice.

V1 can generate simulated paper trades and hypothetical P&L only. Do not add real broker execution, live order placement, account linking, or “buy/sell now” messaging without a separate explicit user request, safety review, and audited phase plan.

## Local Defaults

- TradingView Desktop: `/Applications/TradingView.app`
- MCP repo: `/Users/vigy/Documents/New project/tradingview-mcp`
- Node runtime: `/Users/vigy/.nvm/versions/node/v22.14.0/bin/node`
- CDP port: `9333`
- Environment variable: `TV_CDP_PORT=9333`
- Chrome may already use `9222`; do not move TradingView back to `9222` on this machine.

## Common Commands

- Launch or relaunch TradingView with CDP: `./scripts/tv-launch-debug`
- Check MCP health and chart state: `./scripts/tv-health`
- Run any TradingView CLI command: `./scripts/tv-cli <command>`
- Diagnose setup: `./scripts/tv-doctor`
- Run the paper daemon locally: `./scripts/paper-os`
- Run the dashboard: `./scripts/paper-dashboard`
- Generate a paper summary: `./scripts/paper-summary morning` or `./scripts/paper-summary evening`
- Verify paper OS code: `npm test` and `npm run typecheck`

## Paper-Trading OS Workflow

- Shared deterministic logic lives in `packages/shared`.
- The daemon lives in `apps/orchestrator` and stores V1 state in local SQLite under `data/`.
- The dashboard lives in `apps/dashboard` and should remain clear that P&L is hypothetical.
- TradingView reads should go through the existing bridge and helper scripts, especially `state`, `quote`, `ohlcv --summary`, `values`, and Pine read tools.
- The order path is `StrategyAgent -> RiskManagerAgent -> PaperExecutionAgent`; no paper fill may bypass risk checks.
- Every decision should preserve timestamp, snapshot ID, strategy ID, risk result, confidence/rationale, and mode.
- Summary text must say “paper-trading research summary” and must not contain direct buy/sell instructions.

## TradingView Tool Workflow

- Start with `tv_health_check` or `chart_get_state` before reading or mutating a chart.
- For chart analysis, prefer `quote_get`, `data_get_study_values`, `data_get_pine_lines`, `data_get_pine_labels`, `data_get_pine_tables`, and `data_get_ohlcv` with `summary: true`.
- Use `capture_screenshot` when visual confirmation matters.
- For Pine work, use `pine_analyze` before chart injection, then `pine_set_source`, `pine_smart_compile`, and `pine_get_errors` only when the user wants chart-side changes.
- For OpenAI, Codex, ChatGPT Apps SDK, or OpenAI API questions, use the OpenAI developer documentation MCP server before relying on memory.

## Safety Rules

- Keep CDP bound to loopback only; never expose `9333` or `9222` on a network interface.
- Ask before mutating chart state unless the user explicitly requested the mutation.
- Treat `ui_evaluate`, raw coordinate clicks, keyboard automation, Pine saves, alerts, drawings, replay trades, and batch operations as high-risk.
- Avoid piping TradingView stream data to external services without explicit user approval.
- Keep live-money workflows out of this project phase. V1 automation is paper-only, local-first, and research-focused.
- Keep `ENABLE_LIVE_BROKER=false`; if a config attempts to enable it, fail closed.

## Context Rules

- Always use `summary: true` for OHLCV unless individual bars are requested.
- Use `study_filter` when a specific indicator is known.
- Avoid `verbose: true` unless raw drawing IDs or colors are needed.
- Avoid `pine_get_source` on large scripts unless editing is required.
- Call `chart_get_state` once and reuse session entity IDs while they remain valid.
