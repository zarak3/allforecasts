"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant" | "error";
  text: string;
}

export default function AskWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "error", text: data.error ?? "Something went wrong." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.answer ?? "(no answer)" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "error", text: "Network error — try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {open && (
        <div className="mb-3 w-[340px] max-w-[85vw] h-[440px] max-h-[70vh] bg-paper border border-line rounded-lg shadow-lg flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-paper-raised">
            <span className="font-mono text-sm font-semibold text-ink">Ask AllForecasts</span>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-soft hover:text-ink"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-sm text-ink-soft">
                Ask about a country&apos;s data, a live prediction, which indicators correlate, or
                anything else — it can search the web too. Site numbers are always pulled live,
                nothing is invented.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm rounded px-3 py-2 max-w-[90%] ${
                  m.role === "user"
                    ? "bg-accent text-paper self-end"
                    : m.role === "error"
                      ? "bg-warn/10 text-warn self-start"
                      : "bg-paper-raised text-ink self-start whitespace-pre-line"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="text-sm text-ink-soft self-start">Thinking…</div>}
          </div>
          <form onSubmit={ask} className="border-t border-line p-3 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What's Pakistan's inflation rate?"
              className="flex-1 text-sm border border-line rounded px-3 py-2 bg-paper text-ink"
            />
            <button type="submit" className="btn" disabled={loading}>
              Ask
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-sm bg-accent text-paper px-4 py-3 rounded-full shadow-lg hover:opacity-90 transition"
      >
        {open ? "Close" : "Ask AI"}
      </button>
    </div>
  );
}
