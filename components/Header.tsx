import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-line py-5">
      <div className="max-w-4xl mx-auto px-6 flex items-baseline justify-between flex-wrap gap-2">
        <Link href="/" className="font-mono font-semibold text-lg tracking-tight text-ink no-underline">
          All<span className="text-accent">Forecasts</span>
        </Link>
        <nav className="flex gap-5">
          <Link href="/predictions" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Predictions
          </Link>
          <Link href="/countries" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Country data
          </Link>
          <Link href="/insights" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Insights
          </Link>
          <Link href="/#method" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Method
          </Link>
          <a href="mailto:hello@allforecasts.com" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}
