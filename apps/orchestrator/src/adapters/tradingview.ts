import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import type { MarketSnapshot } from "@codex-tv/shared";

const execFileAsync = promisify(execFile);

export class TradingViewCliAdapter {
  constructor(private readonly options: { rootDir: string; tvCdpPort: number; timeoutMs?: number }) {}

  async health(): Promise<Record<string, unknown>> {
    return this.run(["status"]);
  }

  async state(): Promise<Record<string, unknown>> {
    return this.run(["state"]);
  }

  async quote(symbol?: string): Promise<Record<string, unknown>> {
    return this.run(symbol ? ["quote", symbol] : ["quote"]);
  }

  async values(): Promise<Record<string, unknown>> {
    return this.run(["values"]);
  }

  async ohlcvSummary(count = 100): Promise<Record<string, unknown>> {
    return this.run(["ohlcv", "--summary", "--count", String(count)]);
  }

  async captureSnapshot(): Promise<MarketSnapshot> {
    const [state, quote, values] = await Promise.all([
      this.state(),
      this.quote(),
      this.values().catch((error: unknown) => ({ error: String(error) }))
    ]);
    const symbol = stringFrom(state.symbol) ?? stringFrom(quote.symbol) ?? "UNKNOWN";
    const timeframe = stringFrom(state.resolution) ?? stringFrom(state.timeframe) ?? "unknown";
    const price = priceFromQuote(quote);

    return {
      id: `snap_${slug(symbol)}_${Date.now()}`,
      symbol,
      timeframe,
      price,
      timestamp: new Date().toISOString(),
      source: "tradingview-mcp",
      quote,
      state,
      indicators: values
    };
  }

  private async run(args: string[]): Promise<Record<string, unknown>> {
    const script = join(this.options.rootDir, "scripts", "tv-cli");
    const { stdout } = await execFileAsync(script, args, {
      cwd: this.options.rootDir,
      timeout: this.options.timeoutMs ?? 15_000,
      env: {
        ...process.env,
        TV_CDP_PORT: String(this.options.tvCdpPort)
      },
      maxBuffer: 1024 * 1024
    });

    const trimmed = stdout.trim();
    if (!trimmed) return {};
    return JSON.parse(trimmed) as Record<string, unknown>;
  }
}

function priceFromQuote(quote: Record<string, unknown>): number {
  const candidates = [
    quote.price,
    quote.last,
    quote.last_price,
    quote.close,
    quote.value,
    nested(quote, ["data", "price"]),
    nested(quote, ["data", "last"]),
    nested(quote, ["quote", "price"]),
    nested(quote, ["quote", "last"])
  ];
  const price = candidates.map(Number).find((value) => Number.isFinite(value) && value > 0);
  if (!price) throw new Error(`Unable to extract a positive price from TradingView quote: ${JSON.stringify(quote).slice(0, 500)}`);
  return price;
}

function nested(input: Record<string, unknown>, path: string[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) return (value as Record<string, unknown>)[key];
    return undefined;
  }, input);
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}
