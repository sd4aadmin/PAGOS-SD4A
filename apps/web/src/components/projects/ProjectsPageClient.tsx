"use client";

import { proxyFetch } from "@/lib/proxy-fetch";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, RefreshCw, FolderKanban, X,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Mail, Phone, HardHat, Trash2, CalendarDays, ArrowRight,
} from "lucide-react";
import { Project, ProjectStatus, STATUS_LABELS, STATUS_COLORS } from "@/types/project";
import { CreateProjectModal } from "./CreateProjectModal";
import { cn } from "@/lib/utils";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
type SortField = "name" | "status" | "total_value" | "progress" | "estimated_date" | "client_name";
type SortDir   = "asc" | "desc";

export function ProjectsPageClient({ role }: { role: string }) {
  const router = useRouter();
  const [projects, setProjects]               = useState<Project[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState("");
  const [statusFilter, setStatusFilter]       = useState<ProjectStatus | "ALL">("ALL");
  const [showCreate, setShowCreate]           = useState(false);
  const [sortField, setSortField]             = useState<SortField>("name");
  const [sortDir, setSortDir]                 = useState<SortDir>("asc");
  const [engineerFilter, setEngineerFilter]   = useState<string>("ALL");
  const [engineerProfiles, setEngineerProfiles] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await proxyFetch("/projects");
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (role !== "ADMIN") return;
    proxyFetch("/engineer-profiles")
      .then(r => r.json())
      .then((d: { id: string; name: string }[]) => setEngineerProfiles(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [role]);

  async function deleteProject(e: React.MouseEvent, p: Project) {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar "${p.name}" (${p.code})? Esta acción no se puede deshacer.`)) return;
    const res = await proxyFetch(`/projects/${p.id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) { load(); }
    else {
      const text = await res.text().catch(() => "");
      let msg = "Error al eliminar el proyecto";
      try { msg = JSON.parse(text).detail ?? msg; } catch { if (text) msg = text; }
      alert(msg);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  const hasFilters = search.trim() !== "" || statusFilter !== "ALL" || engineerFilter !== "ALL";
  const isAdmin  = role === "ADMIN";
  const isClient = role === "CLIENT";

  const filtered = projects
    .filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (engineerFilter !== "ALL" && p.engineer_profile_id !== engineerFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.client_name ?? "").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      let av: unknown = a[sortField as keyof Project] ?? "";
      let bv: unknown = b[sortField as keyof Project] ?? "";
      if (sortField === "total_value") { av = Number(av); bv = Number(bv); }
      if (sortField === "estimated_date") { av = av ? new Date(av as string).getTime() : 0; bv = bv ? new Date(bv as string).getTime() : 0; }
      if ((av as string) < (bv as string)) return sortDir === "asc" ? -1 : 1;
      if ((av as string) > (bv as string)) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalValue     = projects.reduce((s, p) => s + Number(p.total_value), 0);
  const totalAdvance   = projects.reduce((s, p) => s + (Number(p.total_value) * p.advance_percent) / 100, 0);
  const totalRemaining = totalValue - totalAdvance;

  if (!loading && isClient && projects.length === 0) return <ClientLanding />;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Proyectos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasFilters
              ? `${filtered.length} de ${projects.length} proyectos`
              : `${projects.length} proyecto${projects.length !== 1 ? "s" : ""} en total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)", boxShadow: "0 4px 14px rgba(10,120,129,0.35)" }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo proyecto</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner financiero cliente */}
      {isClient && projects.length > 0 && (
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white"
          style={{ background: "linear-gradient(135deg,#0A7881 0%,#068a8a 50%,#9BE3BF 100%)" }}
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20" style={{ background: "rgba(255,255,255,0.4)" }} />
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-4">Resumen financiero</p>
          <div className="grid grid-cols-3 gap-2 relative z-10">
            {[
              { label: "Valor total",  val: totalValue },
              { label: "Anticipo",     val: totalAdvance },
              { label: "Saldo",        val: totalRemaining },
            ].map(({ label, val }) => (
              <div key={label} className="min-w-0">
                <p className="text-xs text-white/70 mb-1 truncate">{label}</p>
                <p className="text-sm sm:text-base md:text-xl font-black leading-tight break-all">{COP.format(val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyecto, código o cliente…"
            className="w-full pl-10 pr-9 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 focus:border-[#0A7881] text-foreground transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "ALL")}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 focus:border-[#0A7881] transition"
        >
          <option value="ALL">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        {isAdmin && engineerProfiles.length > 0 && (
          <select
            value={engineerFilter}
            onChange={(e) => setEngineerFilter(e.target.value)}
            className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 focus:border-[#0A7881] transition"
          >
            <option value="ALL">Todos los ingenieros</option>
            {engineerProfiles.map((ep) => (
              <option key={ep.id} value={ep.id}>{ep.name}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("ALL"); setEngineerFilter("ALL"); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-muted-foreground border border-border hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando proyectos…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <FolderKanban className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">No hay proyectos que mostrar</p>
          {hasFilters && <button onClick={() => { setSearch(""); setStatusFilter("ALL"); setEngineerFilter("ALL"); }} className="text-xs text-[#0A7881] hover:underline">Limpiar filtros</button>}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <Th field="name"           label="Proyecto"          current={sortField} dir={sortDir} onSort={handleSort} />
                  {isAdmin && <Th field="client_name" label="Cliente"  current={sortField} dir={sortDir} onSort={handleSort} />}
                  <Th field="status"         label="Estado"            current={sortField} dir={sortDir} onSort={handleSort} />
                  {role !== "ENGINEER" && <Th field="total_value" label="Valor" current={sortField} dir={sortDir} onSort={handleSort} align="right" />}
                  <Th field="progress"       label="Avance"            current={sortField} dir={sortDir} onSort={handleSort} align="center" />
                  <Th field="estimated_date" label="Fechas"            current={sortField} dir={sortDir} onSort={handleSort} />
                  {(isAdmin || role === "ENGINEER") && (
                    <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Ingeniero</th>
                  )}
                  {isAdmin && <th className="px-5 py-3.5 w-12" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    {/* Proyecto */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(10,120,129,0.10)" }}>
                          <FolderKanban className="w-4 h-4" style={{ color: "#0A7881" }} />
                        </div>
                        <div>
                          <span className="font-mono text-xs text-muted-foreground block">{p.code}</span>
                          <span className="font-semibold text-foreground">{p.name}</span>
                        </div>
                      </div>
                    </td>

                    {isAdmin && (
                      <td className="px-5 py-4 text-sm text-muted-foreground">{p.client_name}</td>
                    )}

                    {/* Estado */}
                    <td className="px-5 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", STATUS_COLORS[p.status])}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>

                    {/* Valor */}
                    {role !== "ENGINEER" && (
                      <td className="px-5 py-4 text-right font-bold text-foreground tabular-nums">
                        {COP.format(Number(p.total_value))}
                      </td>
                    )}

                    {/* Avance */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${p.progress}%`, background: "linear-gradient(90deg,#0A7881,#9BE3BF)" }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground w-8 text-right">{p.progress}%</span>
                      </div>
                    </td>

                    {/* Fechas */}
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="w-3 h-3" />
                          {p.start_date ? new Date(p.start_date).toLocaleDateString("es-CO") : "—"}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                          <CalendarDays className="w-3 h-3" />
                          {p.estimated_date ? new Date(p.estimated_date).toLocaleDateString("es-CO") : "—"}
                        </div>
                      </div>
                    </td>

                    {/* Ingeniero */}
                    {(isAdmin || role === "ENGINEER") && (
                      <td className="px-5 py-4">
                        {p.engineer_profile_name ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <HardHat className="w-3.5 h-3.5 shrink-0" />
                            {p.engineer_profile_name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                    )}

                    {/* Eliminar */}
                    {isAdmin && (
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => deleteProject(e, p)}
                          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-[#0A7881]/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(10,120,129,0.10)" }}>
                      <FolderKanban className="w-4 h-4" style={{ color: "#0A7881" }} />
                    </div>
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                      <p className="font-bold text-foreground leading-tight">{p.name}</p>
                      {isAdmin && <p className="text-xs text-muted-foreground">{p.client_name}</p>}
                    </div>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold shrink-0", STATUS_COLORS[p.status])}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>

                {/* Barra progreso */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Avance</span>
                    <span className="font-bold text-foreground">{p.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${p.progress}%`, background: "linear-gradient(90deg,#0A7881,#9BE3BF)" }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {role !== "ENGINEER" && (
                    <span className="text-sm font-black text-foreground">{COP.format(Number(p.total_value))}</span>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
                    {p.engineer_profile_name && (
                      <span className="flex items-center gap-1">
                        <HardHat className="w-3 h-3" /> {p.engineer_profile_name}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

/* ── Landing cliente sin proyectos ── */
function ClientLanding() {
  const steps = [
    { n: "1", title: "Consulta inicial",     desc: "Nos reunimos para entender tu proyecto y necesidades." },
    { n: "2", title: "Propuesta técnica",    desc: "Elaboramos propuesta con alcances, memorias de cálculo y costos." },
    { n: "3", title: "Anticipo y arranque",  desc: "Con el anticipo aprobado, iniciamos el modelado y coordinación." },
    { n: "4", title: "Entrega y cierre",     desc: "Revisión final, entrega de modelos y pago del saldo restante." },
  ];
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg"
        style={{ background: "linear-gradient(135deg,#0A7881,#9BE3BF)" }}
      >S</div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-black text-foreground">Bienvenido al Portal SD4A</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Aún no tienes proyectos asignados. Cuando iniciemos tu proyecto, aparecerá aquí con toda la información de avance y pagos.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
        {steps.map((s) => (
          <div key={s.n} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex gap-3">
            <div
              className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
            >{s.n}</div>
            <div>
              <p className="font-bold text-foreground text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm max-w-sm w-full text-left space-y-3">
        <p className="font-bold text-foreground text-sm">¿Listo para comenzar?</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" style={{ color: "#0A7881" }} />
          <span>sd4asas@gmail.com</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4" style={{ color: "#0A7881" }} />
          <span>Contáctanos para agendar una reunión</span>
        </div>
      </div>
    </div>
  );
}

/* ── Columna ordenable ── */
function Th({ field, label, current, dir, onSort, align }: {
  field: SortField; label: string; current: SortField; dir: SortDir;
  onSort: (f: SortField) => void; align?: "right" | "center";
}) {
  const active = current === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={cn(
        "px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  );
}
