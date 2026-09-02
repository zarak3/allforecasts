export default function Footer() {
  return (
    <footer className="border-t border-line py-10 font-mono text-xs text-ink-soft">
      <div className="max-w-4xl mx-auto px-6">
        <p className="max-w-2xl mb-3">
          Nothing on this site is financial advice. Forecasts are probabilistic estimates for
          informational and illustrative purposes only, built from public data sources with
          attribution (World Bank, ONS, WHO, UNESCO). Do not make investment or financial
          decisions based on this content.
        </p>
        <p>
          hello@allforecasts.com ·{" "}
          <a href="https://x.com/allforecast" className="text-ink-soft hover:text-accent">
            @allforecast
          </a>{" "}
          ·{" "}
          <a href="https://instagram.com/allforecast" className="text-ink-soft hover:text-accent">
            Instagram
          </a>
        </p>
      </div>
    </footer>
  );
}
