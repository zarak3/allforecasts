import { supabaseServer } from "@/lib/supabase";
import { displayCountryName } from "@/lib/display-name";
import type { Alert, AlertType } from "@/lib/types";

export const revalidate = 900;
export const metadata = {
  title: "Alerts — AllForecasts",
  description:
    "Real anomalies flagged automatically when a tracked indicator's latest real value moves more than 2 standard deviations from its own trailing history.",
};

const TYPE_LABEL: Record<AlertType, string> = {
  anomaly: "Anomaly",
  event: "Event",
  surprise: "Surprise",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function getAlerts(): Promise<{ alerts: Alert[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("alerts")
      .select("*, entity:entities(id, type, name, code)")
      .order("triggered_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { alerts: (data as unknown as Alert[]) ?? [], loadError: null };
  } catch (err) {
    return { alerts: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}

export default async function AlertsPage() {
  const { alerts, loadError } = await getAlerts();

  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Signals ahead of scheduled data</div>
        <h1 className="text-3xl font-medium mb-3">Alerts</h1>
        <p className="text-ink-soft max-w-xl mb-8">
          Fires automatically when a tracked indicator&apos;s latest real value moves more than 2
          standard deviations from its own trailing history — checked daily against real World
          Bank data, nothing simulated.
        </p>

        {loadError ? (
          <p className="font-mono text-sm text-warn">Could not reach the database ({loadError}).</p>
        ) : alerts.length === 0 ? (
          <p className="font-mono text-sm text-ink-soft">
            No anomalies flagged yet — this fills in as the daily check finds a real deviation.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((a) => (
              <div key={a.id} className="card p-5">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-accent">
                    {TYPE_LABEL[a.type]}
                    {a.entity && ` — ${displayCountryName(a.entity.code, a.entity.name)}`}
                  </span>
                  <span className="font-mono text-xs text-ink-soft shrink-0">{formatDateTime(a.triggered_at)}</span>
                </div>
                <p className="text-sm text-ink mb-2">{a.description}</p>
                <div className="flex items-center gap-4">
                  {a.z_score !== null && (
                    <span className="font-mono text-xs text-ink-soft">z = {a.z_score.toFixed(2)}</span>
                  )}
                  {a.linked_prediction_id && (
                    <a href={`/predictions/${a.linked_prediction_id}/note`} className="font-mono text-xs text-accent">
                      This alert led to a call →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
