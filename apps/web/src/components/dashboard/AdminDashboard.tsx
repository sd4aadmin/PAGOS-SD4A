"use client";

import { proxyFetch } from "@/lib/proxy-fetch";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Users, TrendingUp, Clock, ArrowRight, RefreshCw, CalendarDays, HardHat } from "lucide-react";
import { Project, STATUS_LABELS, STATUS_COLORS } from "@/types/project";
import { cn } from "@/lib/utils";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export function AdminDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    proxyFetch("/projects")
      .then((r) => r.json())
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const active = projects.filter((p) => p.status === "IN_PROGRESS" || p.status === "IN_REVIEW");
  const pending = projects.filter((p) => p.status === "PENDING_ADVANCE" || p.status === "PENDING_FINAL");
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;

  const recent = [...projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bienvenido, {userName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Panel de administración</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<FolderKanban className="w-5 h-5 text-blue-500" />} label="Total proyectos" value={loading ? "…" : String(projects.length)} accent="text-blue-500" />
        <KpiCard icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} label="En ejecución" value={loading ? "…" : String(active.length)} accent="text-emerald-500" />
        <KpiCard icon={<Clock className="w-5 h-5 text-yellow-500" />} label="Pendientes pago" value={loading ? "…" : String(pending.length)} accent="text-yellow-500" />
        <KpiCard icon={<Users className="w-5 h-5 text-purple-500" />} label="Avance promedio" value={loading ? "…" : `${avgProgress}%`} accent="text-purple-500" />
      </div>

      {/* Revenue banner */}
      {!loading && projects.length > 0 && (
        <div className="rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-white" style={{ background: "linear-gradient(135deg, #0A7881 0%, #68B2B7 60%, #9BE3BF 100%)" }}>
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Valor total en cartera</p>
            <p className="text-white text-xl md:text-2xl font-bold">
              {COP.format(projects.reduce((s, p) => s + Number(p.total_value), 0))}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-white/70 text-xs mb-1">Proyectos activos</p>
            <p className="text-white text-xl md:text-2xl font-bold">{active.length}</p>
          </div>
        </div>
      )}

      {/* Recent projects */}
      <div className="bg-card rounded-xl border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-medium text-foreground text-sm">Proyectos recientes</h2>
          <button onClick={() => router.push("/dashboard/projects")} className="text-xs text-sd4a-mid hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Cargando...
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No hay proyectos aún</p>
        ) : (
          <div className="divide-y">
            {recent.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[p.status])}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate mt-0.5">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.client_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {p.start_date && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarDays className="w-3 h-3" />
                        Inicio: {new Date(p.start_date).toLocaleDateString("es-CO")}
                      </span>
                    )}
                    {p.estimated_date && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarDays className="w-3 h-3" />
                        Entrega: {new Date(p.estimated_date).toLocaleDateString("es-CO")}
                      </span>
                    )}
                    {p.engineer_profile_name && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <HardHat className="w-3 h-3" />
                        {p.engineer_profile_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-foreground">{COP.format(Number(p.total_value))}</p>
                  <div className="flex items-center gap-1.5 mt-1 justify-end">
                    <div className="w-16 bg-muted rounded-full h-1.5">
                      <div className="bg-sd4a-cyan h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{p.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border card-shadow">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground font-medium">{label}</span></div>
      <p className={cn("text-2xl font-bold", accent)}>{value}</p>
    </div>
  );
}
