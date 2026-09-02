import Link from "next/link";
import ZenoTeaser from "@/components/ZenoTeaser";
import PredictionCall from "@/components/PredictionCall";

const INDICATORS = [
  { name: "Flash composite PMI (July)", reading: "52.1, up from 49.3", direction: "up" },
  { name: "Retail sales (July)", reading: "−0.5% m/m", direction: "down" },
  { name: "Energy price cap", reading: "+13% from 1 July", direction: "down" },
  { name: "GfK consumer confidence (July)", reading: "+6pts, biggest jump since Nov 2023", direction: "up" },
  { name: "Labour market", reading: "Unemployment flat at 4.9%", direction: "flat" },
] as const;

const arrow: Record<string, { glyph: string; className: string }> = {
  up: { glyph: "↑", className: "text-good" },
  down: { glyph: "↓", className: "text-warn" },
  flat: { glyph: "→", className: "text-ink-soft" },
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
            We track the data that actually matters — for a country, a city, a business, or a
            person — and only publish a forecast once we can defend it. Every call is dated,
            public, and checked against what actually happened.
          </p>
        </div>
      </section>

      <section className="section" id="prediction">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="section-title">Live prediction — #1</h2>
          <div className="card p-7">
            <div className="font-mono text-sm text-ink-soft mb-2">UK monthly GDP · July 2026</div>
            <div className="mb-3">
              <PredictionCall call="+0.1% to +0.3% m/m" size="xl" />
            </div>
            <div className="font-mono text-xs text-ink-soft flex gap-5 flex-wrap mb-5">
              <span>
                Central estimate: <b className="text-ink">~+0.2%</b>
              </span>
              <span>
                Resolves: <b className="text-ink">11 Sept 2026, 7am (ONS)</b>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[480px]">
                <thead>
                  <tr className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="text-left py-2 border-b border-line font-medium">Indicator</th>
                    <th className="text-left py-2 border-b border-line font-medium">Reading</th>
                    <th className="text-center py-2 border-b border-line font-medium">Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {INDICATORS.map((row) => (
                    <tr key={row.name}>
                      <td className="py-2.5 border-b border-line">{row.name}</td>
                      <td className="py-2.5 border-b border-line font-mono whitespace-nowrap">{row.reading}</td>
                      <td className={`py-2.5 border-b border-line font-mono text-center text-lg ${arrow[row.direction].className}`}>
                        {arrow[row.direction].glyph}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-ink-soft mt-4">
              Retail sales dipped, but that reads as payback from a May/June promotional pull-forward
              rather than new weakness. No analyst consensus was published for this release yet;
              professional consensus historically misses by ~0.2pp either way.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="max-w-4xl mx-auto px-6 grid sm:grid-cols-2 gap-4">
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sm mb-1">Countries</div>
              <div className="text-ink-soft text-sm">
                GDP, debt, health, jobs and more, across 217 countries.
              </div>
            </div>
            <Link href="/countries" className="btn mt-4 inline-block w-fit no-underline">
              View table →
            </Link>
          </div>
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sm mb-1">Correlations</div>
              <div className="text-ink-soft text-sm">
                Compare any two indicators yourself, or browse what moves together.
              </div>
            </div>
            <Link href="/correlations" prefetch={false} className="btn mt-4 inline-block w-fit no-underline">
              Compare data →
            </Link>
          </div>
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <div className="font-mono text-sm mb-1">Markets</div>
              <div className="text-ink-soft text-sm">
                Gold, oil, silver, and major currencies — live, interactive.
              </div>
            </div>
            <Link href="/markets" prefetch={false} className="btn mt-4 inline-block w-fit no-underline">
              View markets →
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
      <ZenoTeaser />
    </main>
  );
}
