"use client";

import { useEffect, useRef, useState } from "react";
import type { EquityPoint } from "@codex-tv/shared";

export function EquityChart({ points }: { points: EquityPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || points.length === 0) return;
    let cleanup = () => {};

    void import("lightweight-charts")
      .then((charts) => {
        const api = charts as unknown as {
          createChart: (container: HTMLElement, options: Record<string, unknown>) => { remove: () => void; timeScale: () => { fitContent: () => void }; addLineSeries?: (options: Record<string, unknown>) => { setData: (data: unknown[]) => void }; addSeries?: (series: unknown, options: Record<string, unknown>) => { setData: (data: unknown[]) => void } };
          LineSeries?: unknown;
          ColorType?: { Solid: string };
        };
        const chart = api.createChart(container, {
          height: 260,
          layout: {
            background: { type: api.ColorType?.Solid ?? "solid", color: "transparent" },
            textColor: "rgba(247, 250, 255, 0.82)"
          },
          grid: {
            vertLines: { color: "rgba(255,255,255,0.06)" },
            horzLines: { color: "rgba(255,255,255,0.08)" }
          },
          rightPriceScale: { borderColor: "rgba(255,255,255,0.12)" },
          timeScale: { borderColor: "rgba(255,255,255,0.12)" },
          crosshair: { mode: 0 }
        });

        const series = chart.addSeries && api.LineSeries
          ? chart.addSeries(api.LineSeries, { color: "#90f7d3", lineWidth: 3 })
          : chart.addLineSeries?.({ color: "#90f7d3", lineWidth: 3 });

        series?.setData(points.map((point) => ({
          time: Math.floor(new Date(point.timestamp).getTime() / 1000),
          value: point.equity
        })));
        chart.timeScale().fitContent();
        cleanup = () => chart.remove();
      })
      .catch(() => setFallback(true));

    return () => cleanup();
  }, [points]);

  if (fallback) return <SvgEquityChart points={points} />;

  return <div className="chart-canvas" ref={containerRef} aria-label="Equity curve chart" />;
}

function SvgEquityChart({ points }: { points: EquityPoint[] }) {
  const width = 720;
  const height = 260;
  const padding = 22;
  const values = points.map((point) => point.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const d = points
    .map((point, index) => {
      const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((point.equity - min) / span) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Equity curve fallback chart">
      <defs>
        <linearGradient id="equityGlow" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#9bd7ff" />
          <stop offset="100%" stopColor="#90f7d3" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#equityGlow)" strokeLinecap="round" strokeWidth="5" />
    </svg>
  );
}
