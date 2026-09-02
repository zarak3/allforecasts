import ZenoChat from "@/components/ZenoChat";

export const metadata = { title: "Zeno — AllForecasts" };

const FEATURES = [
  { label: "Chat", detail: "Ask anything, in plain language" },
  { label: "Files", detail: "Attach a document, image, or PDF" },
  { label: "Web search", detail: "Pulls in current information" },
  { label: "Live site data", detail: "Reads directly from AllForecasts" },
];

export default function ZenoPage() {
  return (
    <main className="section pt-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="eyebrow mb-3">AllForecasts assistant</div>
        <h1 className="text-3xl font-medium mb-3">Meet Zeno</h1>
        <p className="text-ink-soft max-w-xl mb-6">
          Zeno answers questions about any country&apos;s data, AllForecasts&apos; live predictions,
          or how indicators relate — grounded in real numbers, never invented. Ask it something
          broader and it can search the web too.
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          {FEATURES.map((f) => (
            <div key={f.label} className="card px-4 py-2.5">
              <span className="font-mono text-xs text-accent">{f.label}</span>
              <span className="text-ink-soft text-xs ml-2">{f.detail}</span>
            </div>
          ))}
        </div>

        <ZenoChat />
      </div>
    </main>
  );
}
