"use client";

import { useState } from "react";
import { formatCurrency, summarizePerformance, type DashboardState } from "@codex-tv/shared";
import { EquityChart } from "./EquityChart";

const tabs = [
  "Overview",
  "Paper Trades",
  "Hypothetical P&L",
  "Agent Activity",
  "Decision Ledger",
  "Risk Console",
  "Strategy Lab",
  "Daily Summaries",
  "Settings"
] as const;

type Tab = typeof tabs[number];

export function DashboardShell({ initialState }: { initialState: DashboardState }) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const state = initialState;
  const metrics = state.summaries[0]?.metrics ?? summarizePerformance(state.ledger);
  const latestSnapshot = state.snapshots[0];
  const latestRisk = state.riskResults[0];

  return (
    <main className="dashboard-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />

      <aside className="sidebar glass">
        <div className="brand-lockup">
          <div className="orbital-mark">CX</div>
          <div>
            <p className="eyebrow">Codex x TradingView</p>
            <h1>Paper OS</h1>
          </div>
        </div>
        <nav className="nav-list" aria-label="Dashboard pages">
          {tabs.map((tab) => (
            <button className={tab === activeTab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </nav>
        <div className="safety-card">
          <span className="status-dot" />
          <strong>Live broker disabled</strong>
          <p>All fills are simulated. No real-money order path ships in V1.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="command-bar glass">
          <div>
            <p className="eyebrow">Local-first daemon</p>
            <h2>{activeTab}</h2>
          </div>
          <div className="command-actions">
            <span className="risk-pill">Risk {latestRisk?.approved ? "clear" : "watch"}</span>
            <span className="risk-pill quiet">TV port 9333</span>
            <span className="risk-pill quiet">WhatsApp opt-in</span>
          </div>
        </header>

        {activeTab === "Overview" && (
          <Overview state={state} latestSnapshot={latestSnapshot} />
        )}
        {activeTab === "Paper Trades" && <PaperTrades state={state} />}
        {activeTab === "Hypothetical P&L" && <ProfitAndLoss state={state} />}
        {activeTab === "Agent Activity" && <AgentActivity state={state} />}
        {activeTab === "Decision Ledger" && <DecisionLedger state={state} />}
        {activeTab === "Risk Console" && <RiskConsole state={state} />}
        {activeTab === "Strategy Lab" && <StrategyLab state={state} />}
        {activeTab === "Daily Summaries" && <DailySummaries state={state} />}
        {activeTab === "Settings" && <Settings state={state} />}

        <aside className="summary-drawer glass">
          <p className="eyebrow">Hypothetical P&L</p>
          <h3>{formatCurrency(metrics.totalPnl)}</h3>
          <p>{metrics.totalPnlPct.toFixed(2)}% total return from paper ledger data.</p>
          <div className="drawer-grid">
            <span>Equity</span>
            <strong>{formatCurrency(metrics.equity)}</strong>
            <span>Drawdown</span>
            <strong>{metrics.maxDrawdownPct.toFixed(2)}%</strong>
            <span>Open positions</span>
            <strong>{metrics.openPositions}</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Overview({ state, latestSnapshot }: { state: DashboardState; latestSnapshot: DashboardState["snapshots"][number] | undefined }) {
  const metrics = state.summaries[0]?.metrics ?? summarizePerformance(state.ledger);
  return (
    <div className="page-grid">
      <section className="hero-card glass">
        <p className="eyebrow">Paper-forward research</p>
        <h2>Autonomous analysis, deterministic risk, simulated fills.</h2>
        <p>
          The system watches TradingView through the local MCP bridge, records decisions, blocks unsafe intents, and models paper fills with explicit slippage and fee assumptions.
        </p>
      </section>
      <MetricCard label="Equity" value={formatCurrency(metrics.equity)} tone="mint" />
      <MetricCard label="Realized P&L" value={formatCurrency(metrics.realizedPnl)} tone="sky" />
      <MetricCard label="Win rate" value={`${metrics.winRatePct.toFixed(2)}%`} tone="amber" />
      <section className="panel glass wide">
        <PanelHeader eyebrow="Curve" title="Hypothetical equity" />
        <EquityChart points={state.ledger.equityCurve} />
      </section>
      <section className="panel glass">
        <PanelHeader eyebrow="Latest TV snapshot" title={latestSnapshot?.symbol ?? "Waiting"} />
        <div className="fact-list">
          <Fact label="Timeframe" value={latestSnapshot?.timeframe ?? "-"} />
          <Fact label="Price" value={latestSnapshot ? formatCurrency(latestSnapshot.price) : "-"} />
          <Fact label="Source" value={latestSnapshot?.source ?? "-"} />
        </div>
      </section>
    </div>
  );
}

function PaperTrades({ state }: { state: DashboardState }) {
  return (
    <div className="page-grid">
      <section className="panel glass wide">
        <PanelHeader eyebrow="Positions" title="Open paper positions" />
        <DataTable
          headers={["Symbol", "Side", "Qty", "Avg entry", "Unrealized"]}
          rows={state.ledger.positions.map((position) => [
            position.symbol,
            position.side,
            String(position.quantity),
            formatCurrency(position.averageEntry),
            formatCurrency(position.unrealizedPnl ?? 0)
          ])}
        />
      </section>
      <section className="panel glass wide">
        <PanelHeader eyebrow="Trades" title="Paper trade ledger" />
        <DataTable
          headers={["Symbol", "Side", "Qty", "Entry", "Exit", "Realized"]}
          rows={state.ledger.trades.map((trade) => [
            trade.symbol,
            trade.side,
            String(trade.quantity),
            formatCurrency(trade.entryPrice),
            trade.exitPrice ? formatCurrency(trade.exitPrice) : "Open",
            trade.realizedPnl !== undefined ? formatCurrency(trade.realizedPnl) : "-"
          ])}
        />
      </section>
    </div>
  );
}

function ProfitAndLoss({ state }: { state: DashboardState }) {
  const metrics = state.summaries[0]?.metrics ?? summarizePerformance(state.ledger);
  return (
    <div className="page-grid">
      <MetricCard label="Total P&L" value={formatCurrency(metrics.totalPnl)} tone="mint" />
      <MetricCard label="Unrealized" value={formatCurrency(metrics.unrealizedPnl)} tone="sky" />
      <MetricCard label="Max drawdown" value={`${metrics.maxDrawdownPct.toFixed(2)}%`} tone="rose" />
      <section className="panel glass wide">
        <PanelHeader eyebrow="TradingView Lightweight Charts" title="Equity curve" />
        <EquityChart points={state.ledger.equityCurve} />
      </section>
    </div>
  );
}

function AgentActivity({ state }: { state: DashboardState }) {
  return (
    <section className="panel glass full-page">
      <PanelHeader eyebrow="Agents" title="Activity stream" />
      <div className="activity-list">
        {state.agentEvents.map((event) => (
          <article className={`activity-item ${event.level}`} key={event.id}>
            <span>{event.agent}</span>
            <strong>{event.message}</strong>
            <time>{formatDate(event.createdAt)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

function DecisionLedger({ state }: { state: DashboardState }) {
  return (
    <div className="page-grid">
      <section className="panel glass wide">
        <PanelHeader eyebrow="Decisions" title="Strategy ledger" />
        <DataTable
          headers={["Strategy", "Score", "Confidence", "Intent", "Rationale"]}
          rows={state.decisions.map((decision) => [
            decision.strategyId,
            decision.score.toFixed(2),
            decision.confidence.toFixed(2),
            decision.intent ? decision.intent.id : "No trade",
            decision.rationale
          ])}
        />
      </section>
      <section className="panel glass wide">
        <PanelHeader eyebrow="Risk" title="Risk outcomes" />
        <DataTable
          headers={["Intent", "Approved", "Reasons"]}
          rows={state.riskResults.map((risk) => [
            risk.intentId,
            risk.approved ? "Approved" : "Blocked",
            risk.reasons.length > 0 ? risk.reasons.join(" ") : "All deterministic checks passed"
          ])}
        />
      </section>
    </div>
  );
}

function RiskConsole({ state }: { state: DashboardState }) {
  const limits = state.limits;
  return (
    <div className="page-grid">
      <section className="panel glass">
        <PanelHeader eyebrow="Hard gate" title="Execution mode" />
        <div className="risk-stack">
          <span className="large-badge safe">Paper only</span>
          <p>Live broker adapters are intentionally disabled in V1 and must be introduced as a separate audited phase.</p>
        </div>
      </section>
      <section className="panel glass">
        <PanelHeader eyebrow="Limits" title="Deterministic controls" />
        <div className="fact-list">
          <Fact label="Max daily loss" value={`${(limits.maxDailyLossPct * 100).toFixed(2)}%`} />
          <Fact label="Max position notional" value={`${(limits.maxPositionNotionalPct * 100).toFixed(2)}%`} />
          <Fact label="Open positions" value={String(limits.maxOpenPositions)} />
          <Fact label="Stale data" value={`${limits.staleDataMs / 1000}s`} />
        </div>
      </section>
    </div>
  );
}

function StrategyLab({ state }: { state: DashboardState }) {
  return (
    <div className="page-grid">
      <section className="hero-card glass">
        <p className="eyebrow">Strategy Lab</p>
        <h2>Momentum RSI Volume</h2>
        <p>
          V1 ships with a deliberately conservative sample strategy. It scores TradingView snapshots and can emit paper intents only after confidence and risk checks agree.
        </p>
      </section>
      {state.decisions.map((decision) => (
        <section className="panel glass" key={decision.id}>
          <PanelHeader eyebrow={decision.strategyId} title={`Score ${decision.score.toFixed(2)}`} />
          <p>{decision.rationale}</p>
        </section>
      ))}
    </div>
  );
}

function DailySummaries({ state }: { state: DashboardState }) {
  return (
    <section className="panel glass full-page">
      <PanelHeader eyebrow="9am / 9pm Pacific" title="Template-safe WhatsApp summaries" />
      <div className="summary-list">
        {state.summaries.map((summary) => (
          <article className="summary-card" key={summary.id}>
            <span>{summary.kind}</span>
            <h3>{summary.headline}</h3>
            <p>{summary.body}</p>
            <time>{formatDate(summary.generatedAt)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

function Settings({ state }: { state: DashboardState }) {
  return (
    <div className="page-grid">
      <section className="panel glass">
        <PanelHeader eyebrow="Runtime" title="Local services" />
        <div className="fact-list">
          <Fact label="TradingView CDP" value="127.0.0.1:9333" />
          <Fact label="Queue" value="BullMQ + Redis" />
          <Fact label="Database" value="SQLite V1" />
          <Fact label="WhatsApp" value="Twilio opt-in" />
        </div>
      </section>
      <section className="panel glass">
        <PanelHeader eyebrow="Safety" title="Acceptance gate" />
        <p>
          Future real-money work requires at least 30 days of paper-forward logs, reproducible reports, no unexplained executions, and explicit manual approval.
        </p>
        <p className="muted">Current sample ledger has {state.ledger.trades.length} paper trades.</p>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "mint" | "sky" | "amber" | "rose" }) {
  return (
    <section className={`metric-card glass ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function PanelHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="panel-header">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
    </header>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}>{row.map((cell, index) => <td key={`${cell}-${index}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
