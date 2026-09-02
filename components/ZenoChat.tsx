"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant" | "error";
  text: string;
}

interface PendingFile {
  name: string;
  media_type: string;
  data: string; // base64
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ZenoChat({ compact = false }: { compact?: boolean }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<PendingFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFileError(null);
    if (f.size > 8 * 1024 * 1024) {
      setFileError("File is too large (8MB max).");
      return;
    }
    try {
      const data = await readFileAsBase64(f);
      setFile({ name: f.name, media_type: f.type || "text/plain", data });
    } catch {
      setFileError("Couldn't read that file.");
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if ((!q && !file) || loading) return;

    const history = [...messages, { role: "user" as const, text: q || `(see attached file: ${file?.name})` }];
    setMessages(history);
    setQuestion("");
    const attachments = file ? [file] : [];
    setFile(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, text }) => ({ role, text })),
          attachments,
        }),
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
    <div
      className={`bg-paper border border-line rounded-lg flex flex-col overflow-hidden ${
        compact ? "h-[440px]" : "h-[600px]"
      }`}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm text-ink-soft">
            Ask about a country&apos;s data, a live prediction, which indicators correlate, attach a
            file to discuss, or ask anything else — Zeno can search the web too. Site numbers are
            always pulled live, nothing is invented.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm rounded px-3 py-2 max-w-[85%] ${
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
        {loading && <div className="text-sm text-ink-soft self-start">Zeno is thinking…</div>}
      </div>

      {(file || fileError) && (
        <div className="px-4 pb-2 flex items-center gap-2">
          {file && (
            <span className="font-mono text-xs bg-paper-raised border border-line rounded px-2 py-1 inline-flex items-center gap-2">
              📎 {file.name}
              <button type="button" onClick={() => setFile(null)} className="text-ink-soft hover:text-warn" aria-label="Remove file">
                ✕
              </button>
            </span>
          )}
          {fileError && <span className="text-xs text-warn">{fileError}</span>}
        </div>
      )}

      <form onSubmit={ask} className="border-t border-line p-3 flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept=".txt,.md,.csv,.json,.pdf,image/*"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="font-mono text-sm border border-line rounded px-3 py-2 text-ink-soft hover:text-ink hover:border-ink-soft"
          title="Attach a file"
          aria-label="Attach a file"
        >
          📎
        </button>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Zeno anything…"
          className="flex-1 text-sm border border-line rounded px-3 py-2 bg-paper text-ink"
        />
        <button type="submit" className="btn" disabled={loading}>
          Ask
        </button>
      </form>
    </div>
  );
}
