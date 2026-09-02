"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A quiet, sitewide launcher for the full Zeno experience at /zeno --
// keeping one chat surface (the dedicated page) rather than a second,
// separate conversation living in a floating panel. Hidden on the Zeno
// page itself, since linking to the page you're already on is pointless.
export default function AskWidget() {
  const pathname = usePathname();
  if (pathname === "/zeno") return null;

  return (
    <Link
      href="/zeno"
      className="fixed bottom-5 right-5 z-50 font-mono text-sm bg-accent text-paper px-4 py-3 rounded-full shadow-lg hover:opacity-90 transition no-underline"
    >
      Ask Zeno
    </Link>
  );
}
