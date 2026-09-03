import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { pearson } from "@/lib/stats";
import { callGemini } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Zeno: the "natural language interface" from the project's own vision --
// an agentic loop where the model can call real tools against the live
// database, search the live web, and read attached files, but never
// invents a site number itself -- exactly the "stats compute, AI narrates"
// split the rest of the site holds to.
//
// Primary: Gemini (gemini-3.6-flash) -- genuinely free within quota once
// the Google Cloud project is verified, but that free tier caps at just
// 20 requests/day per model, confirmed live (a multi-round tool-calling
// conversation can burn several calls fast). Fallback: Groq
// (openai/gpt-oss-120b), which has no practical daily cap, used
// automatically ONLY when Gemini specifically reports quota exhaustion
// (429 / RESOURCE_EXHAUSTED) -- other Gemini errors surface normally
// rather than silently hiding behind Groq, so a real bug still gets
// noticed. Their request/response shapes are different enough (contents/
// parts vs. messages/tool_calls) that a fallback re-runs the whole
// request through Groq from the original inputs rather than trying to
// splice state between the two mid-conversation.
//
// Web search stays on Tavily's free tier (no card, 1,000/month) for
// both providers -- deliberately not Gemini's Google Search grounding,
// which is billed per query even on free-tier models.

const SYSTEM_PROMPT = `You are Zeno, the AllForecasts assistant. AllForecasts is a cross-domain forecasting site: it pulls public data (currently World Bank indicators across 217 countries -- GDP, debt, inflation, unemployment, oil/resource rents, health, education, population), screens for genuine statistical relationships, and publishes dated, falsifiable predictions. You can read text files a user attaches (not images or PDFs -- say so if one comes through unreadable).

You answer questions on any topic, directly and confidently, using your own knowledge -- exactly like a general assistant. Forecasting and AllForecasts are your specialty, not a boundary on what you're allowed to discuss: don't redirect a general question back to the site, and don't lead every reply with a forecast/data framing just because that's your specialty. Only reach for the site tools below when the question is actually about AllForecasts' own data or predictions.

Ground rules:
- For anything about a country's tracked indicators, AllForecasts' own predictions, or cross-indicator correlations: use the site tools (lookup_country_data, list_predictions, top_correlations). Never state a specific number for these unless it came from a tool call in this conversation.
- For current events, recent news, or anything that might have changed since your training: use web_search rather than guessing from memory. Cite what you found and note the date if it matters. If a search comes back thin or contradictory, say so instead of picking a confident-sounding answer.
- If the user attached a text file, its contents appear inline in their message -- read and use it directly.
- The site's real published predictions are hand-researched, cross-checked calls with real reasoning -- treat those as authoritative when asked about them.
- The "GDP growth, next period (projected)" indicator (source: "AllForecasts model") is a naive statistical trend extrapolation, not a researched forecast -- say so if asked.
- Correlations from the top_correlations tool are cross-sectional (across countries, right now) -- correlation, not causation, and not the lag-correlation method (Pearson r across time lags) the real predictions use.
- Get to the point. Lead with the answer, not a preamble -- no "Great question!", no restating what was asked, no hedging before you say the thing. Still friendly in tone, but this is a professional assistant, not a chatty one: skip filler, keep it tight, and let plain confidence do the work instead of enthusiasm.
- Plain text only -- no markdown (no **bold**, no bullet points, no headers). The chat UI renders raw text, so markdown syntax shows up as literal asterisks and dashes instead of formatting. Use line breaks and plain sentences to organize an answer instead.`;

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

async function webSearch(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { error: "Web search isn't configured -- missing TAVILY_API_KEY." };

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, max_results: 5, include_answer: "basic" }),
  });
  if (!res.ok) return { error: `Search failed: ${res.status} ${await res.text()}` };

  const data = await res.json();
  const results = (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));
  return { answer: data.answer ?? null, results };
}

async function runTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case "lookup_country_data":
      return lookupCountryData(String(input.country ?? ""));
    case "list_predictions":
      return listPredictions();
    case "top_correlations":
      return topCorrelations();
    case "web_search":
      return webSearch(String(input.query ?? ""));
    default:
      return { error: `Unknown tool ${name}` };
  }
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

function buildAttachedText(m: ClientMessage, isLast: boolean, attachments: Attachment[]): string {
  let text = m.text.slice(0, 4000);
  if (!isLast) return text;
  for (const att of attachments) {
    if (att.media_type.startsWith("image/") || att.media_type === "application/pdf") {
      text += `\n\n[Attached file: ${att.name} -- ${att.media_type} attachments can't be read by Zeno right now, only text files. Describe what's in it if you'd like help with it.]`;
    } else {
      text += `\n\n[Attached file: ${att.name}]\n\n${decodeBase64Text(att.data)}`;
    }
  }
  return text;
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
}

// ---- Gemini path ----

const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: "lookup_country_data",
    description:
      'Get all tracked indicators (GDP, debt, inflation, health, etc.) for one country. Example: {"country": "Pakistan"} or {"country": "PK"}.',
    parameters: {
      type: "object",
      properties: { country: { type: "string", description: "Country name or ISO2 code, e.g. 'Pakistan' or 'PK'" } },
      required: ["country"],
    },
  },
  {
    name: "list_predictions",
    description:
      "List AllForecasts' real published/pending predictions with their reasoning and resolution dates. Takes no arguments -- call with {}.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "top_correlations",
    description:
      "Get the strongest real cross-sectional correlations between indicators, computed across all 217 countries. Takes no arguments -- call with {}.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "web_search",
    description:
      'Search the live web for current information -- news, recent events, or anything that might have changed since training. Example: {"query": "UK inflation rate August 2026"}.',
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "The search query" } },
      required: ["query"],
    },
  },
] as const;

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

async function runGemini(clientMessages: ClientMessage[], attachments: Attachment[], apiKey: string): Promise<string> {
  const contents: GeminiContent[] = clientMessages.map((m, i) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: buildAttachedText(m, i === clientMessages.length - 1, attachments) }],
  }));

  for (let round = 0; round < 5; round++) {
    const result = await callGemini(apiKey, {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      tools: [{ function_declarations: GEMINI_FUNCTION_DECLARATIONS }],
      contents,
    });

    const candidate = (result.candidates as { content?: { parts?: GeminiPart[] } }[] | undefined)?.[0];
    const parts: GeminiPart[] = candidate?.content?.parts ?? [];
    contents.push({ role: "model", parts });

    const functionCalls = parts.filter((p) => p.functionCall);
    if (functionCalls.length === 0) {
      const text = parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join("\n");
      return text || "Zeno didn't return a text answer -- try rephrasing.";
    }

    const responseParts: GeminiPart[] = [];
    for (const call of functionCalls) {
      const output = await runTool(call.functionCall!.name, call.functionCall!.args ?? {});
      responseParts.push({ functionResponse: { name: call.functionCall!.name, response: output as Record<string, unknown> } });
    }
    // "function" isn't a valid role on this API -- confirmed live via
    // Google's own error message. Results go back as role "user".
    contents.push({ role: "user", parts: responseParts });
  }

  throw new Error("Ran out of tool-call rounds without a final answer.");
}

// ---- Groq fallback path ----

const GROQ_TOOLS = [
  {
    type: "function",
    function: {
      name: "lookup_country_data",
      description:
        'Get all tracked indicators (GDP, debt, inflation, health, etc.) for one country. Example: {"country": "Pakistan"} or {"country": "PK"}.',
      parameters: {
        type: "object",
        properties: { country: { type: "string", description: "Country name or ISO2 code, e.g. 'Pakistan' or 'PK'" } },
        required: ["country"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_predictions",
      description:
        "List AllForecasts' real published/pending predictions with their reasoning and resolution dates. Takes no arguments -- call with {}.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "top_correlations",
      description:
        "Get the strongest real cross-sectional correlations between indicators, computed across all 217 countries. Takes no arguments -- call with {}.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        'Search the live web for current information -- news, recent events, or anything that might have changed since training. Example: {"query": "UK inflation rate August 2026"}.',
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The search query" } },
        required: ["query"],
      },
    },
  },
] as const;

interface GroqToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
  name?: string;
}

async function runGroq(clientMessages: ClientMessage[], attachments: Attachment[], apiKey: string): Promise<string> {
  const messages: GroqMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  clientMessages.forEach((m, i) => {
    messages.push({ role: m.role, content: buildAttachedText(m, i === clientMessages.length - 1, attachments) });
  });

  for (let round = 0; round < 5; round++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "openai/gpt-oss-120b", messages, tools: GROQ_TOOLS, max_tokens: 1500 }),
    });
    if (!res.ok) throw new Error(`Groq API error: ${res.status} ${await res.text()}`);

    const result = await res.json();
    const message = result.choices?.[0]?.message;
    if (!message) throw new Error("Groq returned no message");
    messages.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls });

    const toolCalls: GroqToolCall[] = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return message.content || "Zeno didn't return a text answer -- try rephrasing.";
    }

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // malformed arguments -- fall through with an empty object
      }
      const output = await runTool(call.function.name, args);
      messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: JSON.stringify(output) });
    }
  }

  throw new Error("Ran out of tool-call rounds without a final answer.");
}

export async function POST(req: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!geminiKey && !groqKey) {
    return NextResponse.json(
      { error: "Zeno isn't switched on yet -- the site is still waiting on an API key." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const clientMessages: ClientMessage[] = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : [];
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments.slice(0, MAX_ATTACHMENTS) : [];

  if (clientMessages.length === 0 || clientMessages[clientMessages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Missing a user message" }, { status: 400 });
  }

  if (geminiKey) {
    try {
      const answer = await runGemini(clientMessages, attachments, geminiKey);
      return NextResponse.json({ answer });
    } catch (err) {
      if (!isQuotaError(err) || !groqKey) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
      }
      // Gemini's free-tier daily quota (20 requests/model) is exhausted --
      // fall through to Groq using the original inputs. Any other Gemini
      // error surfaces directly above instead of silently hiding here, so
      // a real config/schema bug doesn't go unnoticed behind a working
      // fallback.
    }
  }

  try {
    const answer = await runGroq(clientMessages, attachments, groqKey!);
    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
