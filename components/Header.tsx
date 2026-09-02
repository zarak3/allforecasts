import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-line py-5">
      <div className="max-w-4xl mx-auto px-6 flex items-baseline justify-between flex-wrap gap-2">
        <Link href="/" className="font-serif font-medium text-xl tracking-normal text-ink no-underline whitespace-nowrap">
          <span className="text-[0.62em] align-baseline">All</span>
          <span className="text-accent">Forecasts</span>
        </Link>
        <nav className="flex gap-5">
          <Link href="/predictions" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Predictions
          </Link>
          <Link href="/countries" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Countries
          </Link>
          <Link href="/insights" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Insights
          </Link>
          <Link href="/markets" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Markets
          </Link>
          <Link href="/zeno" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Zeno
          </Link>
          <Link href="/#method" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Method
          </Link>
          <Link href="/contact" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
