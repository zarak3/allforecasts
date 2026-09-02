"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "zeno-teaser-dismissed";

export default function ZenoTeaser() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // ignore — private browsing etc.
    }
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 2200);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 right-5 z-40 w-[260px] card p-4 shadow-lg animate-[fadeIn_0.3s_ease]">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-ink-soft hover:text-ink text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
      <p className="text-sm text-ink mb-3 pr-3">
        👋 I&apos;m <b>Zeno</b>. Ask me about any country&apos;s data, or a live prediction.
      </p>
      <Link
        href="/zeno"
        onClick={dismiss}
        className="btn inline-block text-xs no-underline"
      >
        Chat now →
      </Link>
    </div>
  );
}
