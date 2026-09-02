import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { pearson } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Zeno: the "natural language interface" from the project's own vision --
// an agentic loop where the model can call real tools against the live
// database, search the web, and read attached files, but never invents a
// site number itself -- exactly the "stats compute, AI narrates" split the
// rest of the site holds to.

const SYSTEM_PROMPT = `You are Zeno, the AllForecasts assistant. AllForecasts is a cross-domain forecasting site: it pulls public data (currently World Bank indicators across 217 countries -- GDP, debt, inflation, unemployment, oil/resource rents, health, education, population), screens for genuine statistical relationships, and publishes dated, falsifiable predictions. You can search the live web, and read files a user attaches.

Ground rules:
- For anything about a country's tracked indicators, AllForecasts' own predictions, or cross-indicator correlations: use the site tools (lookup_country_data, list_predictions, top_correlations). Never state a specific number for these unless it came from a tool call in this conversation.
- For general or current-events questions the site's database doesn't cover -- use web_search and cite what you find. Say when you're relying on search results versus the site's own data, and note recency if it matters.
- If the user attached a file, its contents appear inline in their message -- read and use it directly.
- The site's real published predictions are hand-researched, cross-checked calls with real reasoning -- treat those as authoritative when asked about them.
- The "GDP growth, next period (projected)" indicator (source: "AllForecasts model") is a naive statistical trend extrapolation, not a researched forecast -- say so if asked.
- Correlations from the insights tool are cross-sectional (across countries, right now) -- correlation, not causation, and not the lag/Granger-causality method the real predictions use.
- Keep answers short, plain-language, and warm but professional. This is a public-facing assistant, not a terminal.`;

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

// Anthropic's built-in server-side web search tool -- executed by Anthropic
// itself (not something this route implements), so real, current web
// results without needing a separate search API key.
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
};

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
  content?: string | Record<string, unknown>[];
  source?: { type: "base64"; media_type: string; data: string };
}

interface ClientMessage {
  role: "user" | "assistant";
  text: string;
}

interface Attachment {
  name: string;
  media_type: string;
  data: string; // base64, no "data:...;base64," prefix
}

const MAX_HISTORY = 20;
const MAX_ATTACHMENTS = 3;
const MAX_INLINE_TEXT_CHARS = 12000;

function decodeBase64Text(data: string): string {
  return Buffer.from(data, "base64").toString("utf-8").slice(0, MAX_INLINE_TEXT_CHARS);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Zeno isn't switched on yet -- the site is still waiting on an Anthropic API key." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const clientMessages: ClientMessage[] = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : [];
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments.slice(0, MAX_ATTACHMENTS) : [];

  if (clientMessages.length === 0 || clientMessages[clientMessages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Missing a user message" }, { status: 400 });
  }

  const messages: { role: string; content: string | AnthropicContentBlock[] }[] = clientMessages.map(
    (m, i) => {
      const isLast = i === clientMessages.length - 1;
      if (!isLast || attachments.length === 0) {
        return { role: m.role, content: m.text.slice(0, 4000) };
      }
      const blocks: AnthropicContentBlock[] = [];
      for (const att of attachments) {
        if (att.media_type.startsWith("image/")) {
          blocks.push({ type: "image", source: { type: "base64", media_type: att.media_type, data: att.data } });
        } else if (att.media_type === "application/pdf") {
          blocks.push({ type: "document", source: { type: "base64", media_type: att.media_type, data: att.data } });
        } else {
          blocks.push({
            type: "text",
            text: `[Attached file: ${att.name}]\n\n${decodeBase64Text(att.data)}`,
          });
        }
      }
      blocks.push({ type: "text", text: m.text.slice(0, 4000) });
      return { role: m.role, content: blocks };
    }
  );

  for (let round = 0; round < 5; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [...TOOLS, WEB_SEARCH_TOOL],
        messages,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `Anthropic API error: ${res.status} ${errBody}` }, { status: 502 });
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
