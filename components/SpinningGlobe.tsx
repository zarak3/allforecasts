"use client";

import { useEffect, useRef } from "react";
import { geoOrthographic, geoPath, geoGraticule10, geoContains, type GeoSphere } from "d3-geo";
import { useCountryFeatures } from "@/hooks/useCountryFeatures";

const SIZE = 380;

// A canvas-rendered orthographic projection, auto-rotating, draggable, and
// clickable. This is "for play" -- a true sphere projection of real country
// geometry, not a 3D-engine scene, which keeps it dependency-free and fast.
export default function SpinningGlobe({
  selectedCode,
  onSelect,
}: {
  selectedCode: string | null;
  onSelect: (code: string, name: string) => void;
}) {
  const { features } = useCountryFeatures();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef<[number, number]>([-20, -20]);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef<[number, number] | null>(null);
  const idleSinceRef = useRef(0);
  const hoveredIdRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !features) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const projection = geoOrthographic()
      .scale(SIZE / 2 - 4)
      .translate([SIZE / 2, SIZE / 2])
      .clipAngle(90);
    const path = geoPath(projection, ctx);
    const graticule = geoGraticule10();
    const sphere: GeoSphere = { type: "Sphere" };

    let raf = 0;

    function draw() {
      if (!ctx) return;
      projection.rotate(rotationRef.current);
      ctx.clearRect(0, 0, SIZE, SIZE);

      ctx.beginPath();
      path(sphere);
      ctx.fillStyle = "#f2ecdd";
      ctx.fill();

      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = "#ddd4bd88";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      for (const f of features!) {
        ctx.beginPath();
        path(f.geometry as GeoJSON.Geometry);
        const isSelected = f.code !== null && f.code === selectedCode;
        const isHovered = f.id === hoveredIdRef.current;
        ctx.fillStyle = isSelected ? "#1e3a5f" : isHovered ? "#1e3a5f88" : "#e4dcc4";
        ctx.fill();
        ctx.strokeStyle = "#a99b76";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      ctx.beginPath();
      path(sphere);
      ctx.strokeStyle = "#1a1a17";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function tick(t: number) {
      const idleFor = t - idleSinceRef.current;
      if (!draggingRef.current && idleFor > 1200) {
        rotationRef.current = [rotationRef.current[0] + 0.12, rotationRef.current[1]];
      }
      draw();
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function pointerToLonLat(clientX: number, clientY: number): [number, number] | null {
      const rect = canvas!.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * SIZE;
      const y = ((clientY - rect.top) / rect.height) * SIZE;
      return projection.invert ? (projection.invert([x, y]) as [number, number] | null) : null;
    }

    function onPointerDown(e: PointerEvent) {
      draggingRef.current = true;
      lastPointerRef.current = [e.clientX, e.clientY];
      canvas!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      idleSinceRef.current = performance.now();
      if (draggingRef.current && lastPointerRef.current) {
        const [lx, ly] = lastPointerRef.current;
        const dx = e.clientX - lx;
        const dy = e.clientY - ly;
        rotationRef.current = [
          rotationRef.current[0] + dx * 0.4,
          Math.max(-90, Math.min(90, rotationRef.current[1] - dy * 0.4)),
        ];
        lastPointerRef.current = [e.clientX, e.clientY];
        return;
      }
      const lonlat = pointerToLonLat(e.clientX, e.clientY);
      if (!lonlat) {
        hoveredIdRef.current = null;
        return;
      }
      const hit = features!.find((f) => geoContains(f.geometry as GeoJSON.GeometryObject, lonlat));
      hoveredIdRef.current = hit ? hit.id : null;
      canvas!.style.cursor = hit && hit.code ? "pointer" : "grab";
    }
    function onPointerUp(e: PointerEvent) {
      draggingRef.current = false;
      idleSinceRef.current = performance.now();
      canvas!.releasePointerCapture(e.pointerId);
    }
    function onClick(e: MouseEvent) {
      const lonlat = pointerToLonLat(e.clientX, e.clientY);
      if (!lonlat) return;
      const hit = features!.find((f) => geoContains(f.geometry as GeoJSON.GeometryObject, lonlat));
      if (hit?.code) onSelect(hit.code, hit.name);
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("click", onClick);
    };
  }, [features, selectedCode, onSelect]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        style={{ width: SIZE, height: SIZE, touchAction: "none" }}
        aria-label="Spinning globe, drag to rotate, click a country"
      />
      <p className="font-mono text-xs text-ink-soft mt-2">Drag to rotate · click a country</p>
    </div>
  );
}
