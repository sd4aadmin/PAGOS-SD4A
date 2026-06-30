"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban, CheckCircle2, Clock, ArrowRight,
  TrendingUp, CalendarDays, RefreshCw, BadgeCheck
} from "lucide-react";
import { Project, STATUS_LABELS, STATUS_COLORS } from "@/types/project";
import { cn } from "@/lib/utils";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export function ClientDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proxy/projects")
      .then((r) => r.json())
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const active = projects.filter((p) => !["DELIVERED", "PAID"].includes(p.status));
  const delivered = projects.filter((p) => p.status === "DELIVERED");
  const pendingPayment = projects.filter((p) => p.status === "PENDING_ADVANCE" || p.status === "PENDING_FINAL");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando tus proyectos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bienvenido, {userName.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Aquí puedes ver el estado de todos tus proyectos</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <FolderKanban className="w-5 h-5 text-sd4a-blue" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{projects.length}</p>
            <p className="text-xs text-muted-foreground">Proyectos totales</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{active.length}</p>
            <p className="text-xs text-muted-foreground">En progreso</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pendingPayment.length}</p>
            <p className="text-xs text-muted-foreground">Pendiente pago</p>
          </div>
        </div>
      </div>

      {/* Active projects */}
      {active.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-foreground text-sm">Proyectos activos</h2>
            <button onClick={() => router.push("/dashboard/projects")} className="text-xs text-sd4a-blue hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {active.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => router.push(`/dashboard/projects/${p.id}`)} />
          ))}
        </div>
      )}

      {/* Pending payment alert */}
      {pendingPayment.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-yellow-900 text-sm">
                {pendingPayment.length === 1 ? "Tienes un pago pendiente" : `Tienes ${pendingPayment.length} pagos pendientes`}
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                {pendingPayment.map((p) => p.name).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delivered */}
      {delivered.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Proyectos entregados
          </h2>
          {delivered.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => router.push(`/dashboard/projects/${p.id}`)} muted />
          ))}
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderKanban className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Aún no tienes proyectos</p>
          <p className="text-xs mt-1">Contacta a SD4A para iniciar un proyecto</p>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p, onClick, muted = false }: { project: Project; onClick: () => void; muted?: boolean }) {
  const advanceAmount = (Number(p.total_value) * p.advance_percent) / 100;
  const remaining = Number(p.total_value) - advanceAmount;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border rounded-xl p-5 cursor-pointer hover:shadow-sm transition-shadow",
        muted && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[p.status])}>
              {STATUS_LABELS[p.status]}
            </span>
          </div>
          <h3 className="font-semibold text-foreground">{p.name}</h3>
          {p.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Avance del proyecto</span>
          <span className="font-medium text-foreground">{p.progress}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={cn("h-2 rounded-full transition-all", p.progress === 100 ? "bg-emerald-500" : "bg-sd4a-cyan")}
            style={{ width: `${p.progress}%` }}
          />
        </div>
      </div>

      {/* Financials */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <FinanceItem label="Valor total" value={COP.format(Number(p.total_value))} icon={<BadgeCheck className="w-3.5 h-3.5 text-muted-foreground" />} />
        <FinanceItem label={`Anticipo (${p.advance_percent}%)`} value={COP.format(advanceAmount)} icon={<BadgeCheck className="w-3.5 h-3.5 text-yellow-500" />} />
        <FinanceItem label="Restante" value={COP.format(remaining)} icon={<BadgeCheck className="w-3.5 h-3.5 text-blue-400" />} />
      </div>

      {p.estimated_date && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5" />
          Entrega estimada: {new Date(p.estimated_date).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
        </div>
      )}
    </div>
  );
}

function FinanceItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2.5">
      <div className="flex items-center gap-1 mb-1">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="text-xs font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
