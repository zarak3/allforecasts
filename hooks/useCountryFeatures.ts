"use client";

import { useEffect, useState } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { ISO_NUMERIC_TO_ALPHA2 } from "@/lib/iso-numeric-alpha2";

export interface CountryFeature {
  id: string; // numeric ISO id from the topojson
  code: string | null; // alpha-2, if we could resolve it
  name: string;
  geometry: Geometry;
}

const TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

let cache: CountryFeature[] | null = null;
let inflight: Promise<CountryFeature[]> | null = null;

async function load(): Promise<CountryFeature[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch(TOPOJSON_URL)
      .then((res) => res.json())
      .then((topo: Topology) => {
        const collection = feature(
          topo,
          topo.objects.countries as GeometryCollection
        ) as unknown as FeatureCollection;
        const feats = collection.features.map((f, i) => {
          const name = (f.properties as { name?: string } | null)?.name ?? "Unknown";
          // A few disputed/unrecognized territories (N. Cyprus, Somaliland,
          // Kosovo) ship without a numeric id in this topojson -- fall back
          // to a name-based key so React keys stay unique. They won't
          // resolve to an alpha-2 code either, so they render but aren't
          // clickable, same as any other unmapped feature.
          const id = f.id != null ? String(f.id).padStart(3, "0") : `noid-${name}-${i}`;
          return {
            id,
            code: ISO_NUMERIC_TO_ALPHA2[id] ?? null,
            name,
            geometry: f.geometry,
          };
        });
        cache = feats;
        return feats;
      });
  }
  return inflight;
}

export function useCountryFeatures() {
  const [features, setFeatures] = useState<CountryFeature[] | null>(cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) {
      setFeatures(cache);
      return;
    }
    load()
      .then(setFeatures)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return { features, loading: !features && !error, error };
}
