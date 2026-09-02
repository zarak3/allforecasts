"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ZenoLogo from "@/components/ZenoLogo";

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
      className="fixed bottom-5 right-5 z-50 font-mono text-sm bg-accent text-paper pl-3 pr-4 py-2.5 rounded-full shadow-lg hover:opacity-90 transition no-underline inline-flex items-center gap-1.5"
    >
      <ZenoLogo size={16} />
      Ask Zeno
    </Link>
  );
}
