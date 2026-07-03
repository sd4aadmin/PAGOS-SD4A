"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, TrendingUp, RefreshCw, ArrowRight } from "lucide-react";
import { Project, STATUS_LABELS, STATUS_COLORS } from "@/types/project";
import { cn } from "@/lib/utils";

export function EngineerDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proxy/projects")
      .then((r) => r.json())
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const inProgress = projects.filter((p) => p.status === "IN_PROGRESS" || p.status === "IN_REVIEW");

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bienvenido, {userName.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Proyectos asignados a ti</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-sd4a-blue" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{loading ? "…" : projects.length}</p>
            <p className="text-xs text-muted-foreground">Proyectos asignados</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{loading ? "…" : inProgress.length}</p>
            <p className="text-xs text-muted-foreground">En ejecución</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-medium text-foreground text-sm">Mis proyectos</h2>
          <button onClick={() => router.push("/dashboard/projects")} className="text-xs text-sd4a-blue hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Cargando...
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No tienes proyectos asignados</p>
        ) : (
          <div className="divide-y">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[p.status])}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.client_name}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div className="bg-sd4a-cyan h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-7">{p.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
