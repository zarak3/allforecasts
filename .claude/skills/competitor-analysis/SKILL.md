---
description: Deep-dive research on a competitor of AllForecasts — how it operates, what data it gathers, and what forecasting method it uses — then synthesizes a combined method with AllForecasts' own approach. Use when the user asks to research, analyze, or compare against a competitor.
argument-hint: [competitor name or URL]
allowed-tools: WebSearch, WebFetch, Read
---

Produce a detailed competitor teardown for: $ARGUMENTS

This is a research task. Do not modify any files or write code — the report
you produce in conversation is the entire deliverable.

## Procedure

1. **Resolve the competitor.** Use WebSearch/WebFetch to find and confirm the
   competitor's actual current product (site, app, or service). Don't rely on
   prior knowledge alone — verify what it does today, since positioning and
   features change. If the argument is ambiguous (e.g. a name that matches
   multiple products), pick the one most relevant to forecasting/prediction
   and say which one you picked and why.

2. **How it operates.** Cover: business model (subscription, free+ads,
   transaction fees, enterprise licensing, etc.), target customer (individual,
   institution, government), pricing if public, and the actual product
   surface — what a user sees and does on it.

3. **What data it gathers.** Cover: named data sources (as specific as you can
   find — don't just say "public data"), breadth (roughly how many
   indicators/markets/topics it covers), update cadence, whether data is
   public/free vs. proprietary/paid, and geographic/domain coverage.

4. **What method it uses (overview).** Cover: the actual forecasting
   mechanism — crowd wisdom/wisdom-of-crowds aggregation, real-money market
   pricing, expert panels, statistical/ML models, LLM narration, or some mix —
   and how transparent/explainable the competitor is about that mechanism
   publicly.

5. **Find the actual algorithm — go deeper than the marketing description.**
   Most competitors describe their method in vague terms on the homepage
   ("powered by AI", "our proprietary model") but the real mechanics are
   often findable if you dig. Actively search multiple source types before
   giving up:
   - **Official technical docs.** Help center, API reference, or a
     "methodology"/"how it works"/"our model" page — these are more precise
     than marketing copy.
   - **Published papers or preprints.** Search arXiv, SSRN, and Google
     Scholar for founders'/researchers' names + the company name — many
     forecasting companies (Metaculus, Good Judgment, prediction-market
     academics) have peer-reviewed or preprint work describing the actual
     scoring/aggregation method (e.g. Brier score weighting, logarithmic
     scoring rules, extremizing transforms, geometric mean pooling).
   - **Patents.** Search Google Patents for the company name — matching
     engines, aggregation methods, and pricing mechanisms are sometimes
     patented and describe the mechanism in detail.
   - **Open-source code.** Search GitHub for the company/product name — some
     expose scoring, aggregation, or market-making code publicly.
   - **Engineering blog posts, conference talks, podcast/YouTube interviews.**
     Search for founder/CTO/lead-scientist names + "how it works" / "algorithm"
     / "methodology" / talk titles — technical interviews often reveal more
     than the product site.
   - **Job postings.** Current or archived (e.g. via web search cache) job
     listings for roles like "quant researcher" or "forecasting scientist"
     at the company frequently describe the internal stack in enough detail
     to infer the method (e.g. "improve our Brier-score-weighted crowd
     aggregation pipeline").
   - **For prediction markets specifically:** look for whether it's a
     continuous limit order book (CLOB) or automated market maker (AMM,
     e.g. LMSR), how it handles settlement/oracles, and any published
     liquidity/pricing mechanism docs.
   - **For crowd/expert forecasting specifically:** look for the aggregation
     method (simple average vs. weighted by track record vs. extremized
     consensus) and whether individual forecaster calibration/Brier scores
     are tracked and published.

   **Label every claim by evidence strength** — this step exists to find
   real mechanics, not to fabricate plausible-sounding ones:
   - **Confirmed** — stated in the competitor's own docs, a paper/patent
     they authored, or a named-source interview. Cite where.
   - **Inferred** — reasoned from indirect evidence (job postings, product
     behavior, analogous published research by others in the same space)
     but not stated by the competitor directly. Say what it's inferred from.
   - **Unknown/undisclosed** — say so plainly rather than guessing. A
     competitor that discloses nothing is itself a finding (worth noting in
     the "transparency" comparison).

6. **Ground the comparison in AllForecasts' real current method.** Before
   proposing anything, read the `project_allforecasts` memory file (and
   `project_allforecasts_predictions` if relevant) at
   `/Users/zarak/.claude/projects/-Users-zarak-claude/memory/` to pull
   AllForecasts' actual settled architecture: Granger-causality/lag-correlation
   screening (not raw correlation), a small fixed 3–5 indicator cross-check
   set, the four-layer AI division (Statistics forecasts, ML screens
   candidates, LLM narrates only, NL interface translates queries), and the
   four-view model (Country/City/Business/Person). Use what's actually there,
   not a re-guess from general knowledge.

7. **Synthesize a combined method.** Produce a clearly separated section with:
   - **Adopt:** specific, concrete techniques from the competitor worth
     folding into AllForecasts (a data source, an update cadence, a
     transparency practice, a UX pattern) — each with a one-line reason.
   - **Don't relitigate:** explicitly check proposals against AllForecasts'
     already-settled architecture decisions (small fixed indicator set,
     LLM-never-forecasts division of labor, individuals-first go-to-market)
     and flag anything that would require reopening a settled decision rather
     than just adding to it.
   - **Don't copy:** things the competitor does that conflict with
     AllForecasts' positioning or would work against it (e.g. a
     raw-data-to-institutions model conflicts with an individuals-first
     go-to-market) — say why, briefly.

## Output format

A structured written report with headed sections matching steps 2–5
(Operates / Data / Method overview / **Algorithm**, with each Algorithm claim
tagged Confirmed / Inferred / Unknown per step 5), then a "Compared to
AllForecasts" section, then the Adopt / Don't relitigate / Don't copy
synthesis from step 7. Keep it concrete and cite what you found, not generic
industry description.
