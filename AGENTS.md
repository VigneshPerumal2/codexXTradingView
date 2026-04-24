# Codex TradingView MCP Instructions

## Purpose

This workspace is configured for Codex to control the local TradingView Desktop app through `tradingview-mcp` and Chrome DevTools Protocol on loopback only.

Use this setup for human-in-the-loop chart analysis, Pine Script development, screenshots, layout inspection, and local workflow automation. Do not treat tool output as financial advice, and do not perform automated trading or machine-driven order decisions.

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
- Keep TradingView data display-oriented and human-reviewed; do not build non-display automated trading workflows from this project.

## Context Rules

- Always use `summary: true` for OHLCV unless individual bars are requested.
- Use `study_filter` when a specific indicator is known.
- Avoid `verbose: true` unless raw drawing IDs or colors are needed.
- Avoid `pine_get_source` on large scripts unless editing is required.
- Call `chart_get_state` once and reuse session entity IDs while they remain valid.
