"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed")) return null;

  return (
    <header className="print:hidden border-b border-line py-5">
      <div className="max-w-4xl mx-auto px-6 flex items-baseline justify-between flex-wrap gap-2">
        <Link href="/" className="font-wordmark font-semibold text-xl tracking-tight text-ink no-underline whitespace-nowrap">
          AllForecasts
        </Link>
        <nav className="flex gap-5">
          <Link href="/predictions" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Predictions
          </Link>
          <Link href="/backtest" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Backtest
          </Link>
          <Link href="/consensus" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Consensus
          </Link>
          <Link href="/alerts" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Alerts
          </Link>
          <Link href="/countries" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Countries
          </Link>
          <Link href="/compare" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Compare
          </Link>
          <Link href="/correlations" prefetch={false} className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Correlations
          </Link>
          <Link href="/markets" prefetch={false} className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Markets
          </Link>
          <Link href="/stocks" prefetch={false} className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Stocks
          </Link>
          <Link href="/zeno" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Zeno
          </Link>
          <Link href="/contact" className="font-mono text-sm text-ink-soft no-underline hover:text-accent">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
