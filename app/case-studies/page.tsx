export const metadata = {
  title: "Case Studies — AllForecasts",
  description:
    "Three real backtest results, reframed as short strategy memos — situation, so-what, recommendation — instead of the trader-style write-up used on Notable Calls.",
};

interface Memo {
  title: string;
  tag: string;
  call: string;
  actual: string;
  situation: string;
  soWhat: string;
  recommendation: string;
}

const MEMOS: Memo[] = [
  {
    title: "UK GDP growth, 2022",
    tag: "United Kingdom · GDP growth (annual %) · backtest",
    call: "Model range: -4.12% to +5.78% (68% band)",
    actual: "Actual (World Bank): +5.15%",
    situation:
      "2022 sat inside the UK's post-pandemic recovery window, where growth rates were swinging far outside their pre-2020 norms. A naive trend model fit on the preceding 24 years of real GDP growth history — which includes the 2020 collapse and 2021 rebound — produced an unusually wide ±4.95pp band around its point estimate.",
    soWhat:
      "The wide band wasn't a flaw — it was the model correctly reading real historical volatility rather than pretending to more precision than the data supported. The actual outcome (+5.15%) landed near the top of that range: a genuine, large positive surprise the model's central point estimate alone would have badly understated, but which its honestly-wide band still bounded.",
    recommendation:
      "Read a mechanical model's band width as a volatility signal in its own right, not just noise around the point estimate. In a period a country's own history shows as unstable, a wide range is the model being honest, not being wrong — and is exactly why AllForecasts states one instead of a single number.",
  },
  {
    title: "US inflation, 2020",
    tag: "United States · Inflation, consumer prices (annual %) · backtest",
    call: "Model range: -0.64% to +3.50% (68% band)",
    actual: "Actual (World Bank): +1.23%",
    situation:
      "2020 was a structural-break year: COVID-era demand collapse, followed by the supply-driven inflation surge that didn't peak until 2022. A trend model fit only on pre-2020 history has no way to know a break is coming.",
    soWhat:
      "It hit anyway — 1.23% actual landed comfortably inside the stated range — but that's partly luck of timing: the demand shock hadn't yet been offset by the stimulus-driven surge that would blow well past this same model's band in 2021-22. A model that's right for reasons it can't take credit for is still a model whose limits need stating plainly.",
    recommendation:
      "Don't read one hit as validation through a structural break — read the following year instead. This is precisely the scenario the site's own miss-cause taxonomy exists for (a real 'structural break' category, not an excuse invented after the fact); a mechanical model earning credit here would be the wrong lesson to take from it.",
  },
  {
    title: "Pakistan inflation, 2021",
    tag: "Pakistan · Inflation, consumer prices (annual %) · backtest",
    call: "Model range: -0.15% to +17.03% (68% band)",
    actual: "Actual (World Bank): +9.50%",
    situation:
      "Pakistan's inflation history is genuinely far more volatile than the UK's or US's — the same mechanical model, fit on Pakistan's own real 24-year history, produced a ±8.59pp band, roughly four times wider than the equivalent UK or US inflation band (±2.17pp, ±2.07pp).",
    soWhat:
      "That's not the model being less useful for Pakistan — it's the model correctly quantifying that Pakistani CPI is mechanically less predictable from its own trend alone than UK or US CPI is, using nothing but each country's own real history. The band width is itself a real, derived measure of regime volatility, not an assumption.",
    recommendation:
      "For a portfolio manager or analyst sizing risk across markets, the relative width of this naive model's band across countries is a usable signal on its own — an emerging-market inflation series showing 4x the band width of a developed-market one is worth knowing before deciding how much confidence any forecast for it deserves, from any source.",
  },
];

export default function CaseStudiesPage() {
  return (
    <main className="section pt-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="eyebrow mb-3">Strategy memos</div>
        <h1 className="text-3xl font-medium mb-3">Case studies</h1>
        <p className="text-ink-soft max-w-xl mb-3">
          Three real backtest results (see <a href="/backtest" className="text-accent">Backtest</a>{" "}
          for the full set), reframed as short situation/so-what/recommendation memos instead of
          the trader-style write-up used on Notable Calls — a different narrative template over
          the same real data, not new analysis.
        </p>
        <p className="font-mono text-xs text-ink-soft max-w-xl mb-10">
          🔬 All three are backtested — retrospective runs of the mechanical trend model against
          real historical data — not live, real-time-published predictions.
        </p>

        <div className="flex flex-col gap-8">
          {MEMOS.map((memo) => (
            <div key={memo.title} className="card p-6">
              <div className="font-mono text-[10px] uppercase tracking-wide text-accent mb-1">{memo.tag}</div>
              <h2 className="text-xl font-medium mb-3">{memo.title}</h2>
              <div className="font-mono text-xs text-ink-soft flex gap-4 flex-wrap mb-4 pb-4 border-b border-line">
                <span>{memo.call}</span>
                <span className="text-ink">{memo.actual}</span>
              </div>
              <div className="mb-4">
                <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">Situation</div>
                <p className="text-sm text-ink">{memo.situation}</p>
              </div>
              <div className="mb-4">
                <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">So what</div>
                <p className="text-sm text-ink">{memo.soWhat}</p>
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">Recommendation</div>
                <p className="text-sm text-ink">{memo.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
