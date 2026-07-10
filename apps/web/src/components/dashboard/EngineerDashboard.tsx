"use client";

import { proxyFetch } from "@/lib/proxy-fetch";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, TrendingUp, RefreshCw, ArrowRight, HardHat } from "lucide-react";
import { Project, STATUS_LABELS, STATUS_COLORS } from "@/types/project";
import { cn } from "@/lib/utils";

export function EngineerDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    proxyFetch("/projects")
      .then((r) => r.json())
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const inProgress = projects.filter((p) => p.status === "IN_PROGRESS" || p.status === "IN_REVIEW");
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-0.5">Panel de ingeniería</p>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">
            Hola, <span style={{ color: "#0A7881" }}>{userName.split(" ")[0]}</span> 👋
          </h1>
        </div>
        <span className="hidden sm:block text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      {/* Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 text-white"
        style={{ background: "linear-gradient(135deg, #0A7881 0%, #068a8a 50%, #9BE3BF 100%)" }}
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20" style={{ background: "rgba(255,255,255,0.3)" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-2">Resumen de proyectos</p>
            <p className="text-3xl md:text-4xl font-black">{loading ? "…" : projects.length} proyectos</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-black">{loading ? "…" : inProgress.length}</p>
              <p className="text-white/70 text-xs mt-0.5">En ejecución</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black">{loading ? "…" : `${avgProgress}%`}</p>
              <p className="text-white/70 text-xs mt-0.5">Avance prom.</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(59,130,246,0.12)" }}>
            <FolderKanban className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-foreground mb-1">{loading ? "…" : projects.length}</p>
          <p className="text-xs text-muted-foreground font-medium">Proyectos asignados</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(16,185,129,0.12)" }}>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-foreground mb-1">{loading ? "…" : inProgress.length}</p>
          <p className="text-xs text-muted-foreground font-medium">En ejecución</p>
        </div>
      </div>

      {/* Lista proyectos */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="font-bold text-foreground">Mis proyectos</h2>
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition hover:bg-muted"
            style={{ color: "#0A7881" }}
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Cargando...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
            <HardHat className="w-10 h-10 opacity-20" />
            <p className="text-sm">No tienes proyectos asignados</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 cursor-pointer transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(10,120,129,0.10)" }}>
                  <FolderKanban className="w-4 h-4" style={{ color: "#0A7881" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[p.status])}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.client_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${p.progress}%`, background: "linear-gradient(90deg,#0A7881,#9BE3BF)" }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-7 text-right">{p.progress}%</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
