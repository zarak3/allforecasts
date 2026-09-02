---
description: Research current Gemini, Grok, ChatGPT/OpenAI, and Claude/Anthropic model capabilities, then produce portable prompt/tool-design improvements for Zeno (AllForecasts' assistant) plus a plain-language comparison of what a paid model tier would actually buy over the current free one. Use when asked to benchmark Zeno against other AI assistants or improve its capability.
argument-hint: []
allowed-tools: WebSearch, WebFetch, Read
---

Research how today's frontier AI assistants actually work, then turn that
into two concrete things for Zeno (AllForecasts' assistant, currently running
on Groq's free `openai/gpt-oss-120b`): portable techniques to apply now, and
an honest picture of what upgrading to a paid model would buy.

This is a research task. Do not modify any files or write code — the report
you produce in conversation is the entire deliverable, unless the user
explicitly asks you to apply a specific finding afterward.

## Ground yourself first

Read `app/api/ask/route.ts` in full before researching anything — it has
Zeno's actual current system prompt, tool definitions, and model
(`openai/gpt-oss-120b` via Groq's free tier, chosen specifically because it
requires no billing account). Everything you recommend has to work against
this real implementation, not a generic assistant.

## Research each of these

For **Gemini** (Google), **Grok** (xAI), **ChatGPT/the OpenAI API**, and
**Claude** (Anthropic — the model this session itself runs on, so note
directly what you know from being built on it, tagged as such):

1. **Model tiers and pricing.** What tiers exist right now (flagship,
   mid-size, small/fast), and current per-token or subscription pricing for
   each. Model names and prices change often — verify current ones via
   search/fetch, don't rely on training-data assumptions.
2. **Capabilities relevant to an assistant like Zeno**: context window size,
   tool/function-calling reliability, whether live web search is built in
   (and whether it's free or billed separately — this mattered directly for
   why Zeno dropped Gemini), multimodal input (image/PDF), and any public
   reasoning/knowledge benchmark results (only cite ones you can find, don't
   estimate a score yourself).
3. **What's actually free**, if anything, and what strings are attached (a
   card on file, rate limits, model restrictions) — this is the exact
   question that shaped Zeno's current setup, so get it right per provider.

Tag every claim: **Confirmed** (found in the provider's own docs/pricing
page — cite where), **Inferred** (reasoned from indirect evidence), or
**Unknown** (not found — say so, don't guess). Same discipline as the
competitor-analysis skill.

## Produce two outputs

**1. Portable improvements for Zeno now — no cost, no model change.**
Prompt-engineering and tool-design techniques the frontier assistants use
(or that are well-documented best practice) that would work on
`openai/gpt-oss-120b` exactly as it runs today: things like how they scope
a persona without over-narrowing it, how they structure tool descriptions
for reliable calling, how they handle "I don't know"/no-web-search honesty,
context management, or few-shot framing. For each one, say exactly what to
change in `app/api/ask/route.ts` and why. Only include things you're
confident would actually help this specific setup — not a generic listicle.

**2. A plain comparison: what would a paid tier actually buy.** A table or
short section per provider: cheapest paid tier that would meaningfully beat
`openai/gpt-oss-120b` on the free Groq tier, its real cost at Zeno's likely
usage (a low-traffic assistant on an early-stage site, not enterprise
volume), and what it would concretely add (live web search, larger context,
stronger reasoning, multimodal). Present this as information for a decision,
not a recommendation to switch — Zeno has already moved off two providers
this session specifically to stay free (Gemini wanted a card, so did the
first attempt), so don't imply switching again is the obvious next step.
