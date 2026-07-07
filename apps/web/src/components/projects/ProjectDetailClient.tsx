"use client";

import { proxyFetch } from "@/lib/proxy-fetch";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Pencil, Trash2, Users, CalendarDays,
  TrendingUp, BadgeCheck, Loader2, Printer, UserPlus, X
} from "lucide-react";
import { Project, ProjectStatus, STATUS_LABELS, STATUS_COLORS } from "@/types/project";
import { PaymentsSection } from "@/components/payments/PaymentsSection";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import FilesSection from "@/components/files/FilesSection";
import { cn } from "@/lib/utils";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

const STATUSES: ProjectStatus[] = [
  "PENDING_ADVANCE", "IN_PROGRESS", "IN_REVIEW", "FINISHED", "PENDING_FINAL", "PAID", "DELIVERED"
];

export function ProjectDetailClient({ projectId, role }: { projectId: string; role: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editProgress, setEditProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editStatus, setEditStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<ProjectStatus>("IN_PROGRESS");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isAdmin = role === "ADMIN";
  const canEdit = role === "ADMIN" || role === "ENGINEER";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/proxy/projects/${projectId}`);
    if (res.ok) {
      const data: Project = await res.json();
      setProject(data);
      setProgress(data.progress);
      setNewStatus(data.status);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function saveProgress() {
    setSaving(true);
    await fetch(`/api/proxy/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
    setEditProgress(false);
    await load();
    setSaving(false);
  }

  async function saveStatus() {
    setSaving(true);
    await fetch(`/api/proxy/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setEditStatus(false);
    await load();
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/proxy/projects/${projectId}`, { method: "DELETE" });
    router.push("/dashboard/projects");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando proyecto...
      </div>
    );
  }

  if (!project) {
    return <div className="p-6 text-muted-foreground">Proyecto no encontrado.</div>;
  }

  const advanceAmount = (Number(project.total_value) * project.advance_percent) / 100;

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <button onClick={() => router.push("/dashboard/projects")} className="mt-1 p-1.5 hover:bg-muted rounded-lg transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{project.code}</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[project.status])}>
                {STATUS_LABELS[project.status]}
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-semibold text-foreground leading-tight">{project.name}</h1>
            {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
          {isAdmin && (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {role !== "ENGINEER" && (
          <InfoCard icon={<BadgeCheck className="w-4 h-4 text-sd4a-dark" />} label="Valor total">
            {COP.format(Number(project.total_value))}
          </InfoCard>
        )}
        {role !== "ENGINEER" && (
          <InfoCard icon={<BadgeCheck className="w-4 h-4 text-yellow-500" />} label={`Anticipo (${project.advance_percent}%)`}>
            {COP.format(advanceAmount)}
          </InfoCard>
        )}
        <InfoCard icon={<CalendarDays className="w-4 h-4 text-muted-foreground" />} label="Fecha inicio">
          {project.start_date ? new Date(project.start_date).toLocaleDateString("es-CO") : "—"}
        </InfoCard>
        <InfoCard icon={<CalendarDays className="w-4 h-4 text-muted-foreground" />} label="Entrega estimada">
          {project.estimated_date ? new Date(project.estimated_date).toLocaleDateString("es-CO") : "—"}
        </InfoCard>
      </div>

      {/* Status Pipeline (PASO 19) */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BadgeCheck className="w-4 h-4 text-sd4a-dark" /> Estado del proyecto
          </div>
          {isAdmin && !editStatus && (
            <button onClick={() => setEditStatus(true)} className="text-xs text-sd4a-dark hover:underline flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Cambiar
            </button>
          )}
        </div>
        <StatusPipeline current={project.status} />
        {editStatus && (
          <div className="space-y-2 pt-1">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setEditStatus(false)} className="flex-1 py-1.5 text-sm border border-border rounded-lg hover:bg-muted text-foreground">Cancelar</button>
              <button onClick={saveStatus} disabled={saving} className="flex-1 py-1.5 text-sm bg-sd4a-dark text-white rounded-lg flex items-center justify-center gap-1">
                {saving && <Loader2 className="w-3 h-3 animate-spin" />} Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TrendingUp className="w-4 h-4 text-sd4a-dark" /> Avance del proyecto
          </div>
          {canEdit && !editProgress && (
            <button onClick={() => setEditProgress(true)} className="text-xs text-sd4a-dark hover:underline flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Editar
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-3">
            <div className="bg-sd4a-dark h-3 rounded-full transition-all" style={{ width: `${editProgress ? progress : project.progress}%` }} />
          </div>
          <span className="text-lg font-bold text-foreground w-12 text-right">{editProgress ? progress : project.progress}%</span>
        </div>
        {editProgress && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="flex-1 accent-sd4a-dark"
              />
              <span className="text-lg font-bold text-foreground w-12 text-right">{progress}%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditProgress(false)} className="flex-1 py-1.5 text-sm border border-border rounded-lg hover:bg-muted text-foreground">Cancelar</button>
              <button onClick={saveProgress} disabled={saving} className="flex-1 py-1.5 text-sm bg-sd4a-dark text-white rounded-lg flex items-center justify-center gap-1">
                {saving && <Loader2 className="w-3 h-3 animate-spin" />} Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Files */}
      <FilesSection projectId={project.id} canUpload={canEdit} role={role} />

      {/* Payments — oculto para ingenieros */}
      {role !== "ENGINEER" && <PaymentsSection project={project} role={role} />}

      {/* Activity */}
      {(role === "ADMIN" || role === "ENGINEER") && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <span className="w-4 h-4">📋</span> Historial de actividad
          </h3>
          <ActivityTimeline projectId={project.id} />
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Eliminar proyecto"
        description={`¿Eliminar el proyecto "${project?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Client + Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-sd4a-dark" /> Cliente
          </h3>
          <div>
            <p className="font-medium text-foreground">{project.client_name}</p>
            <p className="text-sm text-muted-foreground">{project.client_email}</p>
          </div>
        </div>
        <EngineersPanel
          projectId={project.id}
          currentEngineerId={project.assigned_engineer_id}
          currentEngineerName={project.assigned_engineer_name}
          isAdmin={isAdmin}
          onUpdated={load}
        />
      </div>
    </div>
  );
}

function StatusPipeline({ current }: { current: ProjectStatus }) {
  const steps: ProjectStatus[] = ["PENDING_ADVANCE", "IN_PROGRESS", "IN_REVIEW", "FINISHED", "PENDING_FINAL", "PAID", "DELIVERED"];
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex items-center gap-0 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors",
                done ? "bg-sd4a-dark border-sd4a-dark text-white" :
                active ? "bg-sd4a-mid border-sd4a-dark text-white" :
                "bg-background border-border text-muted-foreground"
              )}>
                {done ? "✓" : i + 1}
              </div>
              <span className={cn(
                "text-[10px] text-center leading-tight max-w-[60px]",
                active ? "text-sd4a-dark font-semibold" : done ? "text-foreground" : "text-muted-foreground"
              )}>
                {STATUS_LABELS[s].split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-0.5 w-6 mx-0.5 mb-4", done ? "bg-sd4a-dark" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type EngineerOption = { id: string; name: string; email: string };

function EngineersPanel({ projectId, currentEngineerId, currentEngineerName, isAdmin, onUpdated }: {
  projectId: string;
  currentEngineerId?: string | null;
  currentEngineerName?: string | null;
  isAdmin: boolean;
  onUpdated: () => void;
}) {
  const [engineers, setEngineers] = useState<EngineerOption[]>([]);
  const [selectedId, setSelectedId] = useState(currentEngineerId ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    proxyFetch("/users?role=ENGINEER&is_active=true")
      .then(r => r.json())
      .then(d => setEngineers(d.items ?? []));
  }, [isAdmin]);

  useEffect(() => {
    setSelectedId(currentEngineerId ?? "");
  }, [currentEngineerId]);

  async function saveEngineer() {
    setSaving(true);
    await proxyFetch(`/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_engineer_id: selectedId || null }),
    });
    setEditing(false);
    await onUpdated();
    setSaving(false);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-sd4a-dark" /> Ingeniero responsable
        </h3>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-sd4a-dark hover:underline flex items-center gap-1">
            <UserPlus className="w-3 h-3" /> {currentEngineerId ? "Cambiar" : "Asignar"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="flex-1 px-2 py-1.5 border border-border rounded-lg text-sm bg-background text-foreground"
          >
            <option value="">Sin asignar</option>
            {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button
            onClick={saveEngineer}
            disabled={saving}
            className="px-3 py-1.5 bg-sd4a-dark text-white text-sm rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
          </button>
          <button onClick={() => setEditing(false)} className="px-2 py-1.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : currentEngineerName ? (
        <div>
          <p className="text-sm font-medium text-foreground">{currentEngineerName}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin ingeniero asignado</p>
      )}
    </div>
  );
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        {icon} {label}
      </div>
      <p className="font-semibold text-foreground text-sm">{children}</p>
    </div>
  );
}
