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
}
