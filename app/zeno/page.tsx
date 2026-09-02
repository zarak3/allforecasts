import ZenoChat from "@/components/ZenoChat";
import ZenoLogo from "@/components/ZenoLogo";

export const metadata = {
  title: "Zeno — AllForecasts",
  description:
    "Ask Zeno, AllForecasts' AI assistant, about any prediction, indicator, or correlation on the site — grounded in real data, not invented numbers.",
};

export default function ZenoPage() {
  return (
    <main className="section pt-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-6">
          <ZenoLogo size={36} className="text-accent" />
          <h1 className="text-3xl font-medium">Zeno</h1>
        </div>

        <details className="mb-6 group">
          <summary className="font-mono text-xs text-accent cursor-pointer select-none list-none inline-flex items-center gap-1">
            <span className="group-open:hidden">How Zeno works →</span>
            <span className="hidden group-open:inline">Hide ↑</span>
          </summary>
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { label: "Chat", detail: "Ask anything, in plain language" },
              { label: "Files", detail: "Attach a text file to discuss" },
              { label: "General questions", detail: "Not just AllForecasts topics" },
              { label: "Live site data", detail: "Reads directly from AllForecasts" },
            ].map((f) => (
              <div key={f.label} className="card px-4 py-2.5">
                <span className="font-mono text-xs text-accent">{f.label}</span>
                <span className="text-ink-soft text-xs ml-2">{f.detail}</span>
              </div>
            ))}
          </div>
        </details>

        <ZenoChat />
      </div>
    </main>
  );
}
