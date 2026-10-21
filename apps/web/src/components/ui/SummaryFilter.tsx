"use client";

import { cn } from "@/lib/utils";

/** Celda de resumen que además filtra la lista que tiene debajo (clic de nuevo para quitar el filtro). */
export function SummaryFilter({ label, value, detail, tone, active, onClick }: {
  label: string; value: string; detail: string; tone: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? "Quitar filtro" : `Filtrar: ${label.toLowerCase()}`}
      className={cn(
        "px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A7881]/40",
        active && "bg-muted/60"
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums leading-tight", tone)}>{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </button>
  );
}

/** Celda de resumen informativa (sin filtro). */
export function SummaryStat({ label, value, detail, tone }: {
  label: string; value: string; detail?: string; tone?: string;
}) {
  return (
    <div className="px-3 sm:px-4 py-3 min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className={cn("text-sm sm:text-xl font-bold tabular-nums leading-tight break-words", tone ?? "text-foreground")}>{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
