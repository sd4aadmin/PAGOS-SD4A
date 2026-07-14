"use client";

import { proxyFetch } from "@/lib/proxy-fetch";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Pencil, Trash2, CalendarDays,
  TrendingUp, BadgeCheck, Loader2, Printer, UserPlus, X,
  Users, FolderKanban,
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
  const [showIva, setShowIva] = useState(false);

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
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando proyecto…
      </div>
    );
  }

  if (!project) {
    return <div className="p-6 text-muted-foreground">Proyecto no encontrado.</div>;
  }

  const advanceAmount = (Number(project.total_value) * project.advance_percent) / 100;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">

      {/* ── Navegación ── */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push("/dashboard/projects")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Proyectos
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
          {isAdmin && (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Banner del proyecto ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 text-white"
        style={{ background: "linear-gradient(135deg,#0A7881 0%,#068a8a 50%,#9BE3BF 100%)" }}
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20" style={{ background: "rgba(255,255,255,0.3)" }} />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: "rgba(255,255,255,0.15)" }}>
              {project.code}
            </span>
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", STATUS_COLORS[project.status])}>
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black leading-tight mb-1">{project.name}</h1>
          {project.description && <p className="text-white/70 text-sm">{project.description}</p>}

          {role !== "ENGINEER" && (
            <>
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-white/60 text-xs mb-0.5">
                  Valor total {showIva ? "(con IVA 19%)" : "(sin IVA)"}
                </p>
                <p className="text-lg font-black">
                  {COP.format(Number(project.total_value) * (showIva ? 1.19 : 1))}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-0.5">Anticipo ({project.advance_percent}%)</p>
                <p className="text-lg font-black">{COP.format(advanceAmount)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-0.5">Avance</p>
                <p className="text-lg font-black">{project.progress}%</p>
              </div>
            </div>

            {/* Toggle IVA */}
            <label className="inline-flex items-center gap-2 mt-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showIva}
                onChange={(e) => setShowIva(e.target.checked)}
                className="w-4 h-4 rounded accent-[#9BE3BF] cursor-pointer"
              />
              <span className="text-xs text-white/80">Ver valor con IVA (19%)</span>
            </label>
            </>
          )}
        </div>
      </div>

      {/* ── Fechas y datos ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard icon={<CalendarDays className="w-4 h-4" />} label="Fecha inicio" color="#3b82f6" bg="#eff6ff">
          {project.start_date ? new Date(project.start_date).toLocaleDateString("es-CO") : "—"}
        </InfoCard>
        <InfoCard icon={<CalendarDays className="w-4 h-4" />} label="Entrega estimada" color="#f59e0b" bg="#fffbeb">
          {project.estimated_date ? new Date(project.estimated_date).toLocaleDateString("es-CO") : "—"}
        </InfoCard>
        <InfoCard icon={<Users className="w-4 h-4" />} label="Cliente" color="#8b5cf6" bg="#f5f3ff">
          <span className="truncate block">{project.client_name}</span>
        </InfoCard>
        <InfoCard icon={<FolderKanban className="w-4 h-4" />} label="Ingeniero" color="#0A7881" bg="#f0fdfa">
          {project.engineer_profile_name ?? "Sin asignar"}
        </InfoCard>
      </div>

      {/* ── Pipeline de estado ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <BadgeCheck className="w-4 h-4" style={{ color: "#0A7881" }} /> Estado del proyecto
          </h3>
          {isAdmin && !editStatus && (
            <button
              onClick={() => setEditStatus(true)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
            >
              <Pencil className="w-3 h-3" /> Cambiar
            </button>
          )}
        </div>
        <StatusPipeline current={project.status} />
        {editStatus && (
          <div className="space-y-3 pt-2 border-t border-border">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setEditStatus(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-muted text-foreground transition-colors">
                Cancelar
              </button>
              <button
                onClick={saveStatus}
                disabled={saving}
                className="flex-1 py-2.5 text-sm text-white rounded-xl flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Avance ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: "#0A7881" }} /> Avance del proyecto
          </h3>
          {canEdit && !editProgress && (
            <button
              onClick={() => setEditProgress(true)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${editProgress ? progress : project.progress}%`,
                background: "linear-gradient(90deg,#0A7881,#9BE3BF)",
              }}
            />
          </div>
          <span className="text-2xl font-black text-foreground w-16 text-right">
            {editProgress ? progress : project.progress}%
          </span>
        </div>
        {editProgress && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center gap-4">
              <input
                type="range" min={0} max={100} value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: "#0A7881" }}
              />
              <span className="text-xl font-black text-foreground w-12 text-right">{progress}%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditProgress(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-muted text-foreground transition-colors">
                Cancelar
              </button>
              <button
                onClick={saveProgress}
                disabled={saving}
                className="flex-1 py-2.5 text-sm text-white rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Ingeniero asignado (admin only) ── */}
      {isAdmin && (
        <EngineersPanel
          projectId={project.id}
          currentProfileId={project.engineer_profile_id}
          currentProfileName={project.engineer_profile_name}
          isAdmin={isAdmin}
          onUpdated={load}
        />
      )}

      {/* ── Archivos ── */}
      <FilesSection projectId={project.id} canUpload={canEdit} role={role} />

      {/* ── Pagos ── */}
      {role !== "ENGINEER" && <PaymentsSection project={project} role={role} />}

      {/* ── Actividad ── */}
      {(role === "ADMIN" || role === "ENGINEER") && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="text-base">📋</span> Historial de actividad
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
    </div>
  );
}

/* ── Pipeline visual ── */
function StatusPipeline({ current }: { current: ProjectStatus }) {
  const steps: ProjectStatus[] = ["PENDING_ADVANCE", "IN_PROGRESS", "IN_REVIEW", "FINISHED", "PENDING_FINAL", "PAID", "DELIVERED"];
  const idx = steps.indexOf(current);
  const SHORT: Record<string, string> = {
    PENDING_ADVANCE: "Anticipo", IN_PROGRESS: "En curso", IN_REVIEW: "Revisión",
    FINISHED: "Terminado", PENDING_FINAL: "Saldo", PAID: "Pagado", DELIVERED: "Entregado",
  };
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2 -mx-1 px-1">
      {steps.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex items-start gap-0 shrink-0">
            <div className="flex flex-col items-center gap-1.5 min-w-[52px]">
              <div className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all",
                done   ? "border-[#0A7881] text-white" :
                active ? "border-[#0A7881] text-white shadow-lg" :
                "bg-background border-border text-muted-foreground"
              )} style={done ? { background: "#0A7881" } : active ? { background: "linear-gradient(135deg,#0A7881,#68B2B7)" } : {}}>
                {done ? "✓" : i + 1}
              </div>
              <span className={cn(
                "text-[10px] text-center leading-tight px-0.5",
                active ? "font-bold" : "text-muted-foreground"
              )} style={active ? { color: "#0A7881" } : {}}>
                {SHORT[s]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-0.5 w-5 mt-4 shrink-0", done ? "bg-[#0A7881]" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Panel ingeniero ── */
type EngineerProfile = { id: string; name: string };

function EngineersPanel({ projectId, currentProfileId, currentProfileName, isAdmin, onUpdated }: {
  projectId: string; currentProfileId?: string | null; currentProfileName?: string | null;
  isAdmin: boolean; onUpdated: () => void;
}) {
  const [profiles, setProfiles] = useState<EngineerProfile[]>([]);
  const [selectedId, setSelectedId] = useState(currentProfileId ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    proxyFetch("/engineer-profiles").then(r => r.json()).then(d => setProfiles(Array.isArray(d) ? d : []));
  }, [isAdmin]);

  useEffect(() => { setSelectedId(currentProfileId ?? ""); }, [currentProfileId]);

  async function saveProfile() {
    setSaving(true);
    await proxyFetch(`/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engineer_profile_id: selectedId || null }),
    });
    setEditing(false);
    await onUpdated();
    setSaving(false);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: "#0A7881" }} /> Ingeniero responsable
        </h3>
        {isAdmin && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
          >
            <UserPlus className="w-3 h-3" /> {currentProfileId ? "Cambiar" : "Asignar"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30"
          >
            <option value="">Sin asignar</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-4 py-2.5 text-white text-sm rounded-xl flex items-center gap-1.5 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Guardar"}
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-2.5 border border-border rounded-xl text-muted-foreground hover:bg-muted">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : currentProfileName ? (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(10,120,129,0.10)" }}>
            <Users className="w-4 h-4" style={{ color: "#0A7881" }} />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{currentProfileName}</p>
            <p className="text-xs text-muted-foreground">Ingeniero asignado</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin ingeniero asignado</p>
      )}
    </div>
  );
}

/* ── InfoCard ── */
function InfoCard({ icon, label, children, color, bg }: {
  icon: React.ReactNode; label: string; children: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color }}>
          {icon}
        </div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="font-bold text-foreground text-sm truncate">{children}</p>
    </div>
  );
}
