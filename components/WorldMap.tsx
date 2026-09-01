"use client";

import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoSphere } from "d3-geo";
import { useCountryFeatures } from "@/hooks/useCountryFeatures";

const WIDTH = 800;
const HEIGHT = 420;

export default function WorldMap({
  selectedCode,
  onSelect,
}: {
  selectedCode: string | null;
  onSelect: (code: string, name: string) => void;
}) {
  const { features, loading, error } = useCountryFeatures();
  const [hovered, setHovered] = useState<string | null>(null);

  const { path } = useMemo(() => {
    const sphere: GeoSphere = { type: "Sphere" };
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], sphere);
    return { path: geoPath(projection) };
  }, []);

  if (error) {
    return <p className="font-mono text-sm text-warn">Map failed to load: {error}</p>;
  }
  if (loading || !features) {
    return <p className="font-mono text-sm text-ink-soft">Loading map…</p>;
  }

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label="World map, click a country">
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="transparent" />
      {features.map((f) => {
        const d = path(f.geometry as GeoJSON.Geometry) ?? "";
        const isSelected = f.code !== null && f.code === selectedCode;
        const isHovered = f.id === hovered;
        const clickable = f.code !== null;
        return (
          <path
            key={f.id}
            d={d}
            fill={isSelected ? "#1e3a5f" : isHovered ? "#1e3a5f55" : "#f2ecdd"}
            stroke="#ddd4bd"
            strokeWidth={0.5}
            style={{ cursor: clickable ? "pointer" : "default" }}
            onMouseEnter={() => setHovered(f.id)}
            onMouseLeave={() => setHovered((h) => (h === f.id ? null : h))}
            onClick={() => clickable && f.code && onSelect(f.code, f.name)}
          >
            <title>{f.name}</title>
          </path>
        );
      })}
    </svg>
  );
}
