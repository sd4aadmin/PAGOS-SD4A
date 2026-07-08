"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Activity } from "lucide-react";

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
  PROJECT_CREATED:        "bg-blue-500",
  PROJECT_UPDATED:        "bg-indigo-500",
  PROJECT_DELETED:        "bg-red-500",
  PAYMENT_CREATED:        "bg-yellow-500",
  PAYMENT_CONFIRMED:      "bg-emerald-500",
  PAYMENT_DELETED:        "bg-red-400",
  PAYMENT_STATUS_UPDATED: "bg-orange-400",
  FILE_UPLOADED:          "bg-teal-500",
  FILE_DELETED:           "bg-red-400",
  DELIVERABLE_UPLOADED:   "bg-teal-500",
  DELIVERABLE_DOWNLOADED: "bg-teal-400",
  DELIVERABLE_DELETED:    "bg-red-400",
  USER_CREATED:           "bg-purple-500",
  USER_UPDATED:           "bg-purple-400",
  USER_DEACTIVATED:       "bg-gray-400",
  LOGIN_SUCCESS:          "bg-emerald-400",
  LOGIN_FAILED:           "bg-orange-400",
  LOGIN:                  "bg-gray-400",
};

const ACTION_LABELS: Record<string, string> = {
  PROJECT_CREATED:        "Proyecto creado",
  PROJECT_UPDATED:        "Proyecto actualizado",
  PROJECT_DELETED:        "Proyecto eliminado",
  PAYMENT_CREATED:        "Pago generado",
  PAYMENT_CONFIRMED:      "Pago confirmado",
  PAYMENT_DELETED:        "Pago eliminado",
  PAYMENT_STATUS_UPDATED: "Estado de pago modificado",
  FILE_UPLOADED:          "Archivo subido",
  FILE_DELETED:           "Archivo eliminado",
  DELIVERABLE_UPLOADED:   "Entregable subido",
  DELIVERABLE_DOWNLOADED: "Entregable descargado",
  DELIVERABLE_DELETED:    "Entregable eliminado",
  USER_CREATED:           "Usuario creado",
  USER_UPDATED:           "Usuario actualizado",
  USER_DEACTIVATED:       "Usuario desactivado",
  LOGIN_SUCCESS:          "Inicio de sesión",
  LOGIN_FAILED:           "Intento fallido",
  LOGIN:                  "Inicio de sesión",
};

const TERM_TRANSLATIONS: Record<string, string> = {
  ADVANCE: "Anticipo",
  PARTIAL: "Pago parcial",
  FINAL: "Pago final",
  CONFIRMED: "Confirmado",
  PENDING: "Pendiente",
  FAILED: "Fallido",
  IN_PROGRESS: "En ejecución",
  PENDING_ADVANCE: "Pendiente anticipo",
  PENDING_FINAL: "Pendiente pago final",
  IN_REVIEW: "En revisión",
  FINISHED: "Terminado",
  PAID: "Pagado",
  DELIVERED: "Entregado",
};

function translateDescription(desc: string): string {
  return desc.replace(/\b(ADVANCE|PARTIAL|FINAL|CONFIRMED|PENDING|FAILED|IN_PROGRESS|PENDING_ADVANCE|PENDING_FINAL|IN_REVIEW|FINISHED|PAID|DELIVERED)\b/g,
    (match) => TERM_TRANSLATIONS[match] ?? match
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Ahora mismo";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ActivityTimeline({
  projectId,
  endpoint,
}: {
  projectId?: string;
  endpoint?: string;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const url = endpoint ?? (projectId
    ? `/api/proxy/activity/project/${projectId}`
    : `/api/proxy/activity?limit=50`);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(url);
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }, [url]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Cargando actividad...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Activity className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">Sin actividad registrada</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-muted" />

      <div className="space-y-4">
        {logs.map((log) => {
          const color = ACTION_COLORS[log.action] ?? "bg-gray-400";
          const label = ACTION_LABELS[log.action] ?? log.action;
          return (
            <div key={log.id} className="relative flex gap-4 pl-9">
              {/* Dot */}
              <div className={`absolute left-2 top-1 w-3 h-3 rounded-full ${color} ring-2 ring-white shrink-0`} />

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                    <p className="text-sm text-muted-foreground mt-0.5">{translateDescription(log.description)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{formatDate(log.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
