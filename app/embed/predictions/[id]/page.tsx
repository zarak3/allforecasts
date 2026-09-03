import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { displayCountryName } from "@/lib/display-name";
import PredictionCard from "@/components/PredictionCard";
import type { Prediction } from "@/lib/types";

export const revalidate = 900;

async function getPrediction(id: string): Promise<Prediction | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("predictions")
    .select("*, entity:entities(id, type, name, code)")
    .eq("id", id)
    .eq("is_backtest", false)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Prediction;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prediction = await getPrediction(id);
  return { title: prediction ? prediction.title : "AllForecasts" };
}

// Minimal, embeddable single-prediction widget -- Header/Footer/AskWidget
// all hide themselves on /embed/* (see their own pathname checks). Meant
// to be dropped in an <iframe> on someone else's site; every visible
// element links back to allforecasts.com.
export default async function EmbedPredictionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prediction = await getPrediction(id);
  if (!prediction) notFound();

  return (
    <div className="p-3">
      <PredictionCard
        prediction={prediction}
        tag={prediction.entity ? displayCountryName(prediction.entity.code, prediction.entity.name) : "Global"}
      />
      <a
        href="https://allforecasts.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[10px] text-ink-soft no-underline block text-center mt-2"
      >
        Powered by AllForecasts
      </a>
    </div>
  );
}
