import Link from "next/link";
import FanChart from "@/components/FanChart";

const INDICATORS = [
  { name: "Flash composite PMI (July)", reading: "52.1, up from 49.3", signal: "bullish", tone: "good" },
  { name: "Retail sales (July)", reading: "−0.5% m/m", signal: "bearish*", tone: "warn" },
  { name: "Energy price cap", reading: "+13% from 1 July", signal: "headwind", tone: "warn" },
  { name: "GfK consumer confidence (July)", reading: "+6pts, biggest jump since Nov 2023", signal: "bullish", tone: "good" },
  { name: "Labour market", reading: "Unemployment flat at 4.9%", signal: "neutral", tone: "neutral" },
] as const;

const toneClass: Record<string, string> = {
  good: "text-good",
  warn: "text-warn",
  neutral: "text-ink-soft",
};

export default function HomePage() {
  return (
    <main>
      <section className="pt-16 pb-0">
        <div className="max-w-4xl mx-auto px-6">
          <div className="eyebrow mb-3">Cross-domain forecasting</div>
          <h1 className="text-4xl md:text-5xl font-medium leading-tight mb-4">
            See what&apos;s coming,
            <br />
            before it&apos;s official.
          </h1>
          <p className="text-lg text-ink-soft max-w-xl">
            AllForecasts pulls together data that&apos;s normally siloed — economic, health,
            education, and increasingly unusual alternative data — screens it for genuine
            lead-lag relationships (Granger causality, not raw correlation), and turns validated
            relationships into plain-language, falsifiable forecasts for a country, a city, a
            business, or a person.
          </p>
        </div>
      </section>

      <FanChart todayLabel="1 Sept 2026" releaseLabel="ONS, 11 Sept 2026" />

      <section className="section" id="prediction">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="section-title">Live prediction — #1</h2>
          <div className="card p-7">
            <div className="font-mono text-sm text-ink-soft">UK monthly GDP · July 2026</div>
            <div className="font-mono text-3xl font-semibold text-accent my-1">+0.1% to +0.3% m/m</div>
            <div className="font-mono text-xs text-ink-soft flex gap-5 flex-wrap mb-5">
              <span>
                Central estimate: <b className="text-ink">~+0.2%</b>
              </span>
              <span>
                Resolves: <b className="text-ink">11 Sept 2026, 7am (ONS)</b>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[520px]">
                <thead>
                  <tr className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="text-left py-2 border-b border-line font-medium">Indicator</th>
                    <th className="text-left py-2 border-b border-line font-medium">Reading</th>
                    <th className="text-left py-2 border-b border-line font-medium">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {INDICATORS.map((row) => (
                    <tr key={row.name}>
                      <td className="py-2.5 border-b border-line">{row.name}</td>
                      <td className="py-2.5 border-b border-line font-mono whitespace-nowrap">{row.reading}</td>
                      <td className={`py-2.5 border-b border-line font-mono ${toneClass[row.tone]}`}>{row.signal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-ink-soft mt-4">
              *Read as payback from May/June promotional pull-forward rather than new weakness. No
              City/analyst consensus was publicly available for this release at time of writing;
              professional consensus historically misses by ~0.2pp, which sets a realistic ceiling
              on precision at this stage.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="method">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="section-title">Method</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg mb-2">Correlation isn&apos;t the method</h3>
              <p className="text-ink-soft text-[15px]">
                Relationships are screened with Granger causality and lag-correlation analysis,
                then checked out-of-sample — not fit to historical curves after the fact.
              </p>
            </div>
            <div>
              <h3 className="text-lg mb-2">Honest about the ceiling</h3>
              <p className="text-ink-soft text-[15px]">
                Full prediction of &quot;the fate of an economy&quot; isn&apos;t realistic —
                reflexivity, the Lucas critique, structural breaks and black swans set hard
                limits. The goal is short-horizon, probabilistic, direction-and-timing forecasts.
              </p>
            </div>
            <div>
              <h3 className="text-lg mb-2">A fixed set of cross-checks</h3>
              <p className="text-ink-soft text-[15px]">
                Good forecasts weigh a handful of independent indicators against each other.
                Indicators are capped, not endlessly added — past that point you&apos;re fitting a
                narrative, not improving accuracy.
              </p>
            </div>
            <div>
              <h3 className="text-lg mb-2">Stats compute, AI explains</h3>
              <p className="text-ink-soft text-[15px]">
                Statistics and ML do the actual forecasting. The language layer narrates and
                contextualises validated output — it never invents a number or makes the call
                itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="max-w-4xl mx-auto px-6 grid sm:grid-cols-2 gap-4">
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sm mb-1">Country comparison</div>
              <div className="text-ink-soft text-sm">
                GDP per capita, life expectancy, and literacy across 10 countries.
              </div>
            </div>
            <Link href="/countries" className="btn mt-4 inline-block w-fit no-underline">
              View table →
            </Link>
          </div>
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sm mb-1">Track record</div>
              <div className="text-ink-soft text-sm">
                Every dated, falsifiable prediction — published and pending.
              </div>
            </div>
            <Link href="/predictions" className="btn mt-4 inline-block w-fit no-underline">
              View predictions →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
