"use client";

import { useState } from "react";

interface Bar {
  label: string;
  value: number;
}

/** Gráfico de barras minimalista en SVG puro, sin dependencias. */
export function MiniBarChart({ data, formatValue }: { data: Bar[]; formatValue: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 100;
  const H = 40;
  const gap = 1.6;
  const barW = (W - gap * (data.length - 1)) / data.length;

  if (data.every((d) => d.value === 0)) {
    return <p className="text-xs text-muted-foreground text-center py-6">Sin datos suficientes todavía.</p>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = Math.max(1, (d.value / max) * (H - 6));
          const x = i * (barW + gap);
          const active = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={0} width={barW} height={H} fill="transparent" />
              <rect
                x={x}
                y={H - h}
                width={barW}
                height={h}
                rx={0.8}
                fill={active ? "#0A7881" : "#68B2B7"}
                opacity={active ? 1 : 0.75}
                style={{ transition: "opacity 0.15s, fill 0.15s" }}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="absolute -top-1 left-0 right-0 flex justify-center pointer-events-none">
          <div
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-lg"
            style={{ background: "#0A7881", transform: `translateX(${(hover / data.length) * 100 - 40}%)` }}
          >
            {data[hover].label}: {formatValue(data[hover].value)}
          </div>
        </div>
      )}
      <div className="flex mt-1.5" style={{ gap: `${gap}%` }}>
        {data.map((d, i) => (
          <span
            key={i}
            className="text-[10px] text-muted-foreground text-center"
            style={{ width: `${barW}%` }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
