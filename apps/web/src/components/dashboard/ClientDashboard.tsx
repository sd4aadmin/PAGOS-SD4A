"use client";

import { proxyFetch } from "@/lib/proxy-fetch";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban, CheckCircle2, Clock, ArrowRight,
  TrendingUp, CalendarDays, RefreshCw,
} from "lucide-react";
import { Project, STATUS_LABELS, STATUS_COLORS } from "@/types/project";
import { cn } from "@/lib/utils";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export function ClientDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    proxyFetch("/projects")
      .then((r) => r.json())
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const active         = projects.filter((p) => !["DELIVERED", "PAID"].includes(p.status));
  const delivered      = projects.filter((p) => p.status === "DELIVERED");
  const pendingPayment = projects.filter((p) => p.status === "PENDING_ADVANCE" || p.status === "PENDING_FINAL");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando tus proyectos…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-0.5">Portal de cliente</p>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">
            Hola, <span style={{ color: "#0A7881" }}>{userName.split(" ")[0]}</span> 👋
          </h1>
        </div>
        <span className="hidden sm:block text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <FolderKanban className="w-5 h-5" />, val: projects.length, label: "Proyectos", color: "#0A7881", bg: "#f0fdfa" },
          { icon: <TrendingUp className="w-5 h-5" />,   val: active.length,   label: "En progreso", color: "#10b981", bg: "#ecfdf5" },
          { icon: <Clock className="w-5 h-5" />,        val: pendingPayment.length, label: "Pago pendiente", color: "#d97706", bg: "#fffbeb" },
        ].map(({ icon, val, label, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{val}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta pagos pendientes */}
      {pendingPayment.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
          <Clock className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#d97706" }} />
          <div>
            <p className="font-bold text-sm" style={{ color: "#92400e" }}>
              {pendingPayment.length === 1 ? "Tienes un pago pendiente" : `Tienes ${pendingPayment.length} pagos pendientes`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#b45309" }}>
              {pendingPayment.map((p) => p.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Proyectos activos */}
      {active.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="font-bold text-foreground">Proyectos activos</h2>
            <button
              onClick={() => router.push("/dashboard/projects")}
              className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              style={{ color: "#0A7881" }}
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {active.map((p) => (
              <ProjectRow key={p.id} project={p} onClick={() => router.push(`/dashboard/projects/${p.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* Proyectos entregados */}
      {delivered.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h2 className="font-bold text-foreground">Proyectos entregados</h2>
          </div>
          <div className="divide-y divide-border">
            {delivered.map((p) => (
              <ProjectRow key={p.id} project={p} onClick={() => router.push(`/dashboard/projects/${p.id}`)} muted />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <FolderKanban className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">Aún no tienes proyectos</p>
          <p className="text-xs">Contacta a SD4A para iniciar tu proyecto</p>
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project: p, onClick, muted = false }: { project: Project; onClick: () => void; muted?: boolean }) {
  const advanceAmount = (Number(p.total_value) * p.advance_percent) / 100;

  return (
    <div
      onClick={onClick}
      className={cn("flex items-center gap-4 px-5 py-4 hover:bg-muted/40 cursor-pointer transition-colors group", muted && "opacity-60")}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(10,120,129,0.10)" }}>
        <FolderKanban className="w-4 h-4" style={{ color: "#0A7881" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[p.status])}>
            {STATUS_LABELS[p.status]}
          </span>
        </div>
        <p className="font-semibold text-foreground truncate">{p.name}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex-1 max-w-[120px] bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${p.progress}%`, background: "linear-gradient(90deg,#0A7881,#9BE3BF)" }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{p.progress}%</span>
          {p.estimated_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3" />
              {new Date(p.estimated_date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-foreground">{COP.format(Number(p.total_value))}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Anticipo {COP.format(advanceAmount)}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
    </div>
  );
}
