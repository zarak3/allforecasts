import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { pearson } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Zeno: the "natural language interface" from the project's own vision --
// an agentic loop where the model can call real tools against the live
// database and read attached files, but never invents a site number
// itself -- exactly the "stats compute, AI narrates" split the rest of the
// site holds to. Runs on Gemini's free tier (gemini-3.8-flash) rather than
// a paid API -- no live web search here, since Gemini's Google Search
// grounding tool is billed per query even on free-tier models, and this
// has to stay genuinely free.

const SYSTEM_PROMPT = `You are Zeno, the AllForecasts assistant. AllForecasts is a cross-domain forecasting site: it pulls public data (currently World Bank indicators across 217 countries -- GDP, debt, inflation, unemployment, oil/resource rents, health, education, population), screens for genuine statistical relationships, and publishes dated, falsifiable predictions. You can read files a user attaches.

Ground rules:
- For anything about a country's tracked indicators, AllForecasts' own predictions, or cross-indicator correlations: use the site tools (lookup_country_data, list_predictions, top_correlations). Never state a specific number for these unless it came from a tool call in this conversation.
- You do not have live web search. For current-events questions the site's database doesn't cover, say so plainly rather than guessing -- don't invent a number or a recent event.
- If the user attached a file, its contents appear inline in their message -- read and use it directly.
- The site's real published predictions are hand-researched, cross-checked calls with real reasoning -- treat those as authoritative when asked about them.
- The "GDP growth, next period (projected)" indicator (source: "AllForecasts model") is a naive statistical trend extrapolation, not a researched forecast -- say so if asked.
- Correlations from the top_correlations tool are cross-sectional (across countries, right now) -- correlation, not causation, and not the lag/Granger-causality method the real predictions use.
- Keep answers short, plain-language, and warm but professional. This is a public-facing assistant, not a terminal.`;

const FUNCTION_DECLARATIONS = [
  {
    name: "lookup_country_data",
    description: "Get all tracked indicators (GDP, debt, inflation, health, etc.) for one country.",
    parameters: {
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
    parameters: { type: "object", properties: {} },
  },
  {
    name: "top_correlations",
    description: "Get the strongest real cross-sectional correlations between indicators, computed across all 217 countries.",
    parameters: { type: "object", properties: {} },
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

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model" | "function";
  parts: GeminiPart[];
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
const SUPPORTED_INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif", "application/pdf"]);

function decodeBase64Text(data: string): string {
  return Buffer.from(data, "base64").toString("utf-8").slice(0, MAX_INLINE_TEXT_CHARS);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Zeno isn't switched on yet -- the site is still waiting on a Gemini API key." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const clientMessages: ClientMessage[] = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : [];
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments.slice(0, MAX_ATTACHMENTS) : [];

  if (clientMessages.length === 0 || clientMessages[clientMessages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Missing a user message" }, { status: 400 });
  }

  const contents: GeminiContent[] = clientMessages.map((m, i) => {
    const isLast = i === clientMessages.length - 1;
    const role = m.role === "assistant" ? "model" : "user";
    if (!isLast || attachments.length === 0) {
      return { role, parts: [{ text: m.text.slice(0, 4000) }] };
    }
    const parts: GeminiPart[] = [];
    for (const att of attachments) {
      if (SUPPORTED_INLINE_TYPES.has(att.media_type)) {
        parts.push({ inline_data: { mime_type: att.media_type, data: att.data } });
      } else {
        parts.push({ text: `[Attached file: ${att.name}]\n\n${decodeBase64Text(att.data)}` });
      }
    }
    parts.push({ text: m.text.slice(0, 4000) });
    return { role, parts };
  });

  for (let round = 0; round < 5; round++) {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          tools: [{ function_declarations: FUNCTION_DECLARATIONS }],
          contents,
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `Gemini API error: ${res.status} ${errBody}` }, { status: 502 });
    }

    const result = await res.json();
    const candidate = result.candidates?.[0];
    const parts: GeminiPart[] = candidate?.content?.parts ?? [];
    contents.push({ role: "model", parts });

    const functionCalls = parts.filter((p) => p.functionCall);
    if (functionCalls.length === 0) {
      const text = parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join("\n");
      return NextResponse.json({ answer: text || "Zeno didn't return a text answer -- try rephrasing." });
    }

    const responseParts: GeminiPart[] = [];
    for (const call of functionCalls) {
      const output = await runTool(call.functionCall!.name, call.functionCall!.args ?? {});
      responseParts.push({ functionResponse: { name: call.functionCall!.name, response: output as Record<string, unknown> } });
    }
    contents.push({ role: "function", parts: responseParts });
  }

  return NextResponse.json({ error: "Ran out of tool-call rounds without a final answer." }, { status: 500 });
}
