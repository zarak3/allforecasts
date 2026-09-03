export type EntityType = "country" | "city" | "business" | "person";

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  code: string | null;
}

export interface Indicator {
  id: string;
  entity_id: string;
  name: string;
  category: string;
  source: string;
  source_code: string | null;
  value: number;
  unit: string | null;
  period: string;
  entity?: Entity;
}

export type PredictionStatus = "pending" | "confirmed" | "missed";
export type MissCause = "structural_break" | "weak_signal" | "outlier_event" | "consensus_was_right";

export const MISS_CAUSE_LABEL: Record<MissCause, string> = {
  structural_break: "Structural break",
  weak_signal: "Weak signal",
  outlier_event: "Outlier event",
  consensus_was_right: "Consensus was simply right",
};

export interface Prediction {
  id: string;
  entity_id: string | null;
  title: string;
  call: string;
  reasoning: string | null;
  published_at: string | null;
  resolves_at: string;
  outcome: string | null;
  outcome_correct: boolean | null;
  entity?: Entity | null;
  // Structured Notable Calls / Backtest fields -- nullable, older rows
  // keep working with just call/reasoning above.
  confidence_pct: number | null;
  signal_summary: string | null;
  falsification_condition: string | null;
  status: PredictionStatus | null;
  resolved_at: string | null;
  related_relationship_ids: string[] | null;
  miss_cause: MissCause | null;
  is_backtest: boolean;
}

export interface Relationship {
  id: string;
  entity_id: string | null;
  indicator_a_name: string;
  indicator_b_name: string;
  lag_period: string | null;
  correlation_strength: number | null;
  sample_size: number | null;
  granger_p_value: number | null; // reserved -- null until a real Granger test is implemented
  discovered_at: string;
  status: "active" | "invalidated";
  entity?: Entity | null;
}

export type AlertType = "anomaly" | "event" | "surprise";

export interface Alert {
  id: string;
  type: AlertType;
  entity_id: string | null;
  indicator_name: string | null;
  triggered_at: string;
  z_score: number | null;
  description: string | null;
  linked_prediction_id: string | null;
  entity?: Entity | null;
}

export interface ConsensusBenchmark {
  id: string;
  entity_id: string | null;
  indicator_name: string;
  release_date: string | null;
  consensus_value: number | null;
  our_prediction_id: string | null;
  our_predicted_value: number | null;
  actual_value: number | null;
  entity?: Entity | null;
  prediction?: Pick<Prediction, "id" | "title"> | null;
}
