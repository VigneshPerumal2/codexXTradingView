# Codex + TradingView MCP Setup

This workspace connects Codex to TradingView Desktop through the local `tradingview-mcp` bridge. It follows the desktop-control workflow from the video, with machine-specific hardening for this Mac.

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
```

Expected state: `9222` may be Chrome, while `9333` should be TradingView.

## Helper Scripts

- `scripts/tv-cli`: runs the TradingView MCP CLI with Node 22 and `TV_CDP_PORT=9333`.
- `scripts/tv-launch-debug`: launches TradingView with CDP enabled on `9333`.
- `scripts/tv-health`: runs read-only MCP health and chart-state checks.
- `scripts/tv-doctor`: prints setup diagnostics for app, ports, Codex MCP, CDP, and MCP health.

## Safety Boundaries

This setup is for human-in-the-loop research, chart analysis, and Pine Script development. It is not a trading bot and should not be used for automated trading, automated order generation, or machine-driven decisions based on TradingView market data.

Keep CDP on loopback only. Do not expose `9333` or `9222` to your LAN or the internet.

## Troubleshooting

- If MCP tools are missing, restart Codex and run `codex mcp list`.
- If `cdp_connected` is false, run `./scripts/tv-launch-debug`.
- If `9222` is busy, leave it alone; this setup intentionally uses `9333`.
- If Pine compile tests fail in the sandbox, rerun with network access or treat them as external-service dependent.
- If TradingView updates break launch behavior, check upstream PRs/issues in `tradesdontlie/tradingview-mcp`.
