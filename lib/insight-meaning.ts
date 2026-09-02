// Turns a raw (category A, category B) correlation into a plain-language
// "why this matters" line and the personas (from the site's own four-view
// model: country/government, city, business, person) it's actually useful
// to. Template-driven from the real category pairing + sign of r, not
// fabricated per indicator pair -- this is honest framing, not new data.

export type Persona = "Government" | "Business" | "Person moving" | "City planner";

interface Interpretation {
  meaning: string;
  personas: Persona[];
}

const PAIR_TEMPLATES: Record<string, (positive: boolean) => Interpretation> = {
  "economic|health": (positive) => ({
    meaning: positive
      ? "Richer countries tend to have better health outcomes here — a quick gut-check for anyone comparing where to live, invest, or expand."
      : "Economic strength doesn't guarantee this health outcome — worth checking directly rather than assuming income covers it.",
    personas: ["Government", "Person moving", "Business"],
  }),
  "economic|education": (positive) => ({
    meaning: positive
      ? "Education levels and economic strength move together — relevant for governments deciding where long-term investment compounds, and businesses scouting skilled labour markets."
      : "Education and this economic measure diverge here — a market that looks strong on paper may not have the workforce depth to match.",
    personas: ["Government", "Business"],
  }),
  "education|health": (positive) => ({
    meaning: positive
      ? "Literacy and health outcomes reinforce each other — useful for governments and NGOs deciding where a health campaign will land hardest."
      : "Literacy alone doesn't explain this health outcome — other factors (infrastructure, access) likely dominate.",
    personas: ["Government"],
  }),
  "demographic|economic": (positive) => ({
    meaning: positive
      ? "Population size tracks with this economic measure — relevant to sovereign risk assessment and to a business sizing up a market."
      : "Bigger population doesn't mean a bigger buffer here — small countries can outperform on this measure.",
    personas: ["Government", "Business"],
  }),
  "demographic|health": () => ({
    meaning: "Population scale and this health outcome are linked — useful context for public health and humanitarian planning.",
    personas: ["Government"],
  }),
  "defence|economic": (positive) => ({
    meaning: positive
      ? "Military spending scales with economic capacity — a benchmark for governments comparing defence budgets to peers, and a signal for defence-adjacent businesses."
      : "Military spending doesn't track this economic measure — some countries spend well beyond what their economy alone would suggest.",
    personas: ["Government", "Business"],
  }),
  "defence|health": () => ({
    meaning: "Defence spending and this health outcome move together across countries — worth a closer look at what's actually driving it before reading too much in.",
    personas: ["Government"],
  }),
  "defence|education": () => ({
    meaning: "Defence spending and education levels correlate here — likely both reflecting overall state capacity rather than a direct link.",
    personas: ["Government"],
  }),
  "defence|demographic": () => ({
    meaning: "Population size and defence spending move together — larger countries generally field larger militaries in absolute terms.",
    personas: ["Government"],
  }),
};

export function interpretPair(categoryA: string, categoryB: string, r: number): Interpretation {
  const key = [categoryA, categoryB].sort().join("|");
  const template = PAIR_TEMPLATES[key];
  if (template) return template(r > 0);
  return {
    meaning: "A real cross-domain signal worth investigating further before drawing conclusions.",
    personas: ["Government"],
  };
}
