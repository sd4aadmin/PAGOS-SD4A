"use client";

import { useId, useState } from "react";

interface Point {
  label: string;
  value: number;
}

/** Gráfico de área/línea suave con degradado y brillo, en SVG puro, sin dependencias. */
export function AreaChart({ data, formatValue }: { data: Point[]; formatValue: (v: number) => string }) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 100;
  const H = 40;
  const PAD_TOP = 4;

  if (data.every((d) => d.value === 0)) {
    return <p className="text-xs text-muted-foreground text-center py-6">Sin datos suficientes todavía.</p>;
  }

  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: PAD_TOP + (H - PAD_TOP) * (1 - d.value / max),
  }));

  // Curva suave (Catmull-Rom -> Bézier)
  function smoothPath(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return `M ${pts[0]?.x ?? 0} ${pts[0]?.y ?? 0}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A7881" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0A7881" stopOpacity="0" />
          </linearGradient>
          <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path d={areaPath} fill={`url(#fill-${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="#0A7881"
          strokeWidth="1.4"
          strokeLinecap="round"
          filter={`url(#glow-${gradientId})`}
        />

        {points.map((p, i) => {
          const active = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={p.x - stepX / 2} y={0} width={stepX || W} height={H} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? 2.2 : 1.3}
                fill={active ? "#0A7881" : "#68B2B7"}
                stroke="#fff"
                strokeWidth={active ? 0.8 : 0}
                style={{ transition: "r 0.15s, fill 0.15s" }}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="absolute -top-1 left-0 right-0 flex justify-center pointer-events-none">
          <div
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-lg"
            style={{ background: "#0A7881", transform: `translateX(${(points[hover].x / W) * 100 - 50}%)` }}
          >
            {data[hover].label}: {formatValue(data[hover].value)}
          </div>
        </div>
      )}
      <div className="flex mt-1.5 justify-between">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-muted-foreground text-center">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
