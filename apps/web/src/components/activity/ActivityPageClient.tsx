"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, Search } from "lucide-react";

interface LogEntry {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action: string;
  description: string;
  metadata_: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  PROJECT_CREATED: "bg-blue-100 text-blue-800",
  PROJECT_UPDATED: "bg-indigo-100 text-indigo-800",
  PROJECT_DELETED: "bg-red-100 text-red-800",
  PAYMENT_CREATED: "bg-yellow-100 text-yellow-800",
  PAYMENT_CONFIRMED: "bg-emerald-100 text-emerald-800",
  USER_CREATED: "bg-purple-100 text-purple-800",
  USER_UPDATED: "bg-purple-50 text-purple-700",
  USER_DEACTIVATED: "bg-muted text-foreground",
};

const ACTION_LABELS: Record<string, string> = {
  PROJECT_CREATED: "Proyecto creado",
  PROJECT_UPDATED: "Proyecto actualizado",
  PROJECT_DELETED: "Proyecto eliminado",
  PAYMENT_CREATED: "Pago generado",
  PAYMENT_CONFIRMED: "Pago confirmado",
  USER_CREATED: "Usuario creado",
  USER_UPDATED: "Usuario actualizado",
  USER_DEACTIVATED: "Usuario desactivado",
};

export function ActivityPageClient() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filtered, setFiltered] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/proxy/activity?limit=200");
    if (res.ok) {
      const data = await res.json();
      setLogs(data);
      setFiltered(data);
    }
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

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Log de actividad</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{logs.length} eventos registrados</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border hover:bg-muted/50">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en descripción..."
            className="pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-cyan w-64"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none"
        >
          <option value="ALL">Todas las acciones</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Activity className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Sin eventos que mostrar</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Acción</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-muted text-foreground"}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{log.description}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("es-CO", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
