import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { displayCountryName } from "@/lib/display-name";
import PrintButton from "@/components/PrintButton";
import type { Prediction } from "@/lib/types";

export const revalidate = 900;

function resolveStatus(p: Prediction) {
  return p.status ?? (p.outcome !== null ? (p.outcome_correct ? "confirmed" : "missed") : "pending");
}

function formatDateTime(iso: string | null) {
  if (!iso) return "not yet published";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function getPrediction(id: string): Promise<Prediction | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("predictions")
    .select("*, entity:entities(id, type, name, code)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Prediction;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prediction = await getPrediction(id);
  return { title: prediction ? `${prediction.title} — Research Note — AllForecasts` : "Research Note — AllForecasts" };
}

export default async function ResearchNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prediction = await getPrediction(id);
  if (!prediction) notFound();

  const status = resolveStatus(prediction);
  const tag = prediction.entity ? displayCountryName(prediction.entity.code, prediction.entity.name) : "Global";

  return (
    <main className="section pt-16 print:pt-0">
      <div className="max-w-2xl mx-auto px-6">
        <div className="print:hidden mb-8">
          <PrintButton />
        </div>

        <div className="font-mono text-[10px] uppercase tracking-wide text-accent mb-2">AllForecasts Research Note</div>
        <div className="font-mono text-xs text-ink-soft mb-1">{tag}</div>
        <h1 className="text-2xl font-medium mb-4">{prediction.title}</h1>

        <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-ink-soft border-y border-line py-3 mb-6">
          <span>
            Published: <b className="text-ink">{formatDateTime(prediction.published_at)}</b>
          </span>
          <span>
            Status:{" "}
            <b className="text-ink">
              {status === "confirmed" ? "🟢 Confirmed" : status === "missed" ? "🔴 Missed" : "🟡 Pending"}
            </b>
          </span>
          {prediction.confidence_pct !== null && (
            <span>
              Confidence: <b className="text-ink">{prediction.confidence_pct}%</b>
            </span>
          )}
          <span>
            Resolves by: <b className="text-ink">{formatDate(prediction.resolves_at)}</b>
          </span>
        </div>

        {prediction.signal_summary && (
          <div className="mb-5">
            <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">The signal</div>
            <p className="text-sm text-ink">{prediction.signal_summary}</p>
          </div>
        )}

        <div className="mb-5">
          <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">The call</div>
          <p className="text-sm text-ink font-medium">{prediction.call}</p>
        </div>

        {prediction.reasoning && (
          <div className="mb-5">
            <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">Why</div>
            <p className="text-sm text-ink whitespace-pre-line">{prediction.reasoning}</p>
          </div>
        )}

        {prediction.falsification_condition && (
          <div className="mb-5">
            <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">What would prove this wrong</div>
            <p className="text-sm text-ink">{prediction.falsification_condition}</p>
          </div>
        )}

        {status !== "pending" && (
          <div className="mb-5 pt-4 border-t border-line">
            <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">Outcome</div>
            <p className="text-sm text-ink">{prediction.outcome ?? "Resolved, outcome text not yet recorded."}</p>
          </div>
        )}

        <p className="font-mono text-[10px] text-ink-soft mt-10 pt-4 border-t border-line">
          allforecasts.com — nothing on this site is financial advice. Forecasts are probabilistic
          estimates for informational and illustrative purposes only.
        </p>
      </div>
    </main>
  );
}
