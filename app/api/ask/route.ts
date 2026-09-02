import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { pearson } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// The "natural language interface" from the project's own vision: an
// agentic loop where the model can call real tools against the live
// database, but never invents a number itself -- exactly the "stats
// compute, AI narrates" split the rest of the site holds to.

const SYSTEM_PROMPT = `You are the AllForecasts assistant. AllForecasts is a cross-domain forecasting site: it pulls public data (currently World Bank indicators across 217 countries -- GDP, debt, inflation, unemployment, oil/resource rents, health, education, population), screens for genuine statistical relationships, and publishes dated, falsifiable predictions.

Ground rules:
- Never state a specific number (a GDP figure, an inflation rate, a correlation, a country's data) unless it came from a tool call in this conversation. If you don't have it, call a tool or say you don't have that data.
- The site's real published predictions (in the predictions table) are hand-researched, cross-checked calls with real reasoning -- treat those as authoritative when asked about them.
- The "GDP growth, next period (projected)" indicator (source: "AllForecasts model") is a naive statistical trend extrapolation, not a researched forecast -- say so if asked about it.
- Correlations from the insights tool are cross-sectional (across countries, right now) -- correlation, not causation, and not the lag/Granger-causality method the real predictions use.
- Keep answers short and plain-language. This is a public-facing assistant, not a terminal.`;

const TOOLS = [
  {
    name: "lookup_country_data",
    description: "Get all tracked indicators (GDP, debt, inflation, health, etc.) for one country.",
    input_schema: {
      type: "object",
      properties: {
        country: { type: "string", description: "Country name or ISO2 code, e.g. 'Pakistan' or 'PK'" },
      },
      required: ["country"],
    },
  },
  {
    name: "list_predictions",
    description: "List AllForecasts' real published/pending predictions with their reasoning and resolution dates.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "top_correlations",
    description: "Get the strongest real cross-sectional correlations between indicators, computed across all 217 countries.",
    input_schema: { type: "object", properties: {} },
  },
] as const;

async function lookupCountryData(country: string) {
  const supabase = supabaseServer();
  const { data: entity } = await supabase
    .from("entities")
    .select("id, name, code")
    .eq("type", "country")
    .or(`name.ilike.%${country}%,code.eq.${country.toUpperCase()}`)
    .limit(1)
    .maybeSingle();
  if (!entity) return { error: `No country matching "${country}"` };

  const { data: indicators } = await supabase
    .from("indicators")
    .select("name, value, unit, source, period")
    .eq("entity_id", entity.id);

  return { country: entity.name, code: entity.code, indicators: indicators ?? [] };
}

async function listPredictions() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("predictions")
    .select("title, call, reasoning, resolves_at, published_at, outcome")
    .order("resolves_at");
  return { predictions: data ?? [] };
}

async function topCorrelations() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("indicators")
    .select("entity_id, name, value, entity:entities!inner(type)")
    .eq("entity.type", "country")
    .range(0, 4999);

  const rows = (data ?? []) as unknown as { entity_id: string; name: string; value: number }[];
  const byIndicator = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!byIndicator.has(row.name)) byIndicator.set(row.name, new Map());
    byIndicator.get(row.name)!.set(row.entity_id, Number(row.value));
  }
  const names = Array.from(byIndicator.keys());
  const results: { a: string; b: string; r: number; n: number }[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const mapA = byIndicator.get(names[i])!;
      const mapB = byIndicator.get(names[j])!;
      const xs: number[] = [];
      const ys: number[] = [];
      for (const [id, v] of mapA) {
        const vb = mapB.get(id);
        if (vb !== undefined) {
          xs.push(v);
          ys.push(vb);
        }
      }
      const r = pearson(xs, ys);
      if (r !== null && xs.length >= 20) results.push({ a: names[i], b: names[j], r, n: xs.length });
    }
  }
  results.sort((p, q) => Math.abs(q.r) - Math.abs(p.r));
  return { top_correlations: results.slice(0, 10) };
}

async function runTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case "lookup_country_data":
      return lookupCountryData(String(input.country ?? ""));
    case "list_predictions":
      return listPredictions();
    case "top_correlations":
      return topCorrelations();
    default:
      return { error: `Unknown tool ${name}` };
  }
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server yet." },
      { status: 503 }
    );
  }

  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const messages: { role: string; content: string | AnthropicContentBlock[] }[] = [
    { role: "user", content: question.slice(0, 2000) },
  ];

  for (let round = 0; round < 4; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Anthropic API error: ${res.status} ${body}` }, { status: 502 });
    }

    const result = await res.json();
    const content: AnthropicContentBlock[] = result.content ?? [];
    messages.push({ role: "assistant", content });

    const toolUses = content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) {
      const text = content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return NextResponse.json({ answer: text });
    }

    const toolResults: AnthropicContentBlock[] = [];
    for (const use of toolUses) {
      const output = await runTool(use.name!, use.input ?? {});
      toolResults.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: JSON.stringify(output),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({ error: "Ran out of tool-call rounds without a final answer." }, { status: 500 });
}
