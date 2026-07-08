"use client";

import { proxyFetch } from "@/lib/proxy-fetch";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, Search, X } from "lucide-react";

interface LogEntry {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action: string;
  description: string;
  metadata_: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_STYLE: Record<string, { bg: string; color: string }> = {
  PROJECT_CREATED:   { bg: "#dbeafe", color: "#1d4ed8" },
  PROJECT_UPDATED:   { bg: "#e0e7ff", color: "#4338ca" },
  PROJECT_DELETED:   { bg: "#fee2e2", color: "#dc2626" },
  PAYMENT_CREATED:   { bg: "#fef3c7", color: "#d97706" },
  PAYMENT_CONFIRMED: { bg: "#d1fae5", color: "#059669" },
  USER_CREATED:      { bg: "#f3e8ff", color: "#7c3aed" },
  USER_UPDATED:      { bg: "#fae8ff", color: "#9333ea" },
  USER_DEACTIVATED:  { bg: "#f1f5f9", color: "#64748b" },
};

const ACTION_LABELS: Record<string, string> = {
  PROJECT_CREATED:   "Proyecto creado",
  PROJECT_UPDATED:   "Proyecto actualizado",
  PROJECT_DELETED:   "Proyecto eliminado",
  PAYMENT_CREATED:   "Pago generado",
  PAYMENT_CONFIRMED: "Pago confirmado",
  USER_CREATED:      "Usuario creado",
  USER_UPDATED:      "Usuario actualizado",
  USER_DEACTIVATED:  "Usuario desactivado",
};

const ACTION_DOTS: Record<string, string> = {
  PROJECT_CREATED:   "#1d4ed8",
  PROJECT_UPDATED:   "#4338ca",
  PROJECT_DELETED:   "#dc2626",
  PAYMENT_CREATED:   "#d97706",
  PAYMENT_CONFIRMED: "#059669",
  USER_CREATED:      "#7c3aed",
  USER_UPDATED:      "#9333ea",
  USER_DEACTIVATED:  "#94a3b8",
};

export function ActivityPageClient() {
  const [logs, setLogs]               = useState<LogEntry[]>([]);
  const [filtered, setFiltered]       = useState<LogEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await proxyFetch("/activity?limit=200");
    if (res.ok) { const data = await res.json(); setLogs(data); setFiltered(data); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let result = logs;
    if (actionFilter !== "ALL") result = result.filter((l) => l.action === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => l.description.toLowerCase().includes(q));
    }
    setFiltered(result);
  }, [search, actionFilter, logs]);

  const uniqueActions = [...new Set(logs.map((l) => l.action))];
  const hasFilters    = search.trim() !== "" || actionFilter !== "ALL";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Actividad</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasFilters ? `${filtered.length} de ${logs.length} eventos` : `${logs.length} eventos registrados`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en descripción…"
            className="w-full pl-10 pr-9 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 focus:border-[#0A7881] transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 focus:border-[#0A7881] transition"
        >
          <option value="ALL">Todas las acciones</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setActionFilter("ALL"); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-muted-foreground border border-border hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando actividad…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Activity className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">Sin eventos que mostrar</p>
          {hasFilters && (
            <button onClick={() => { setSearch(""); setActionFilter("ALL"); }} className="text-xs text-[#0A7881] hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acción</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descripción</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((log) => {
                  const st = ACTION_STYLE[log.action] ?? { bg: "#f1f5f9", color: "#64748b" };
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: st.bg, color: st.color }}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-foreground">{log.description}</td>
                      <td className="px-5 py-4 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("es-CO", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile timeline */}
          <div className="md:hidden space-y-0">
            {filtered.map((log, i) => {
              const st   = ACTION_STYLE[log.action] ?? { bg: "#f1f5f9", color: "#64748b" };
              const dot  = ACTION_DOTS[log.action] ?? "#94a3b8";
              const last = i === filtered.length - 1;
              return (
                <div key={log.id} className="flex gap-3">
                  {/* timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full mt-3.5 shrink-0 ring-2 ring-background" style={{ background: dot }} />
                    {!last && <div className="w-0.5 flex-1 mt-1" style={{ background: "#e2e8f0" }} />}
                  </div>
                  {/* card */}
                  <div className={`flex-1 bg-card border border-border rounded-2xl p-4 shadow-sm ${last ? "" : "mb-3"}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: st.bg, color: st.color }}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(log.created_at).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{log.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
