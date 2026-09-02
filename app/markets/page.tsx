import MarketsExplorer from "@/components/MarketsExplorer";

export const metadata = {
  title: "Markets — AllForecasts",
  description: "Live, interactive charts for gold, silver, oil, copper, natural gas, and every major world currency.",
};

export default function MarketsPage() {
  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Markets</div>
        <h1 className="text-3xl font-medium mb-3">Commodities & currencies</h1>
        <p className="text-ink-soft max-w-xl mb-10">
          Gold, silver, oil, and major currency pairs — real prices, not estimates. Gold and oil
          come from live futures markets; currencies from the ECB&apos;s daily reference rates.
        </p>
        <MarketsExplorer />
      </div>
    </main>
  );
}
