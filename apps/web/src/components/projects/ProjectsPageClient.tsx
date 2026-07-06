"use client";

import { proxyFetch } from "@/lib/proxy-fetch";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, FolderKanban, X, ChevronUp, ChevronDown, ChevronsUpDown, DollarSign, TrendingUp, Clock, Mail, Phone, HardHat } from "lucide-react";
import { Project, ProjectStatus, STATUS_LABELS, STATUS_COLORS } from "@/types/project";
import { CreateProjectModal } from "./CreateProjectModal";
import { cn } from "@/lib/utils";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

type SortField = "name" | "status" | "total_value" | "progress" | "estimated_date" | "client_name";
type SortDir = "asc" | "desc";

export function ProjectsPageClient({ role }: { role: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await proxyFetch("/projects");
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  const hasFilters = search.trim() !== "" || statusFilter !== "ALL";

  const filtered = projects
    .filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.client_name ?? "").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      let av: any = a[sortField as keyof Project] ?? "";
      let bv: any = b[sortField as keyof Project] ?? "";
      if (sortField === "total_value") { av = Number(av); bv = Number(bv); }
      if (sortField === "estimated_date") { av = av ? new Date(av).getTime() : 0; bv = bv ? new Date(bv).getTime() : 0; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const isAdmin = role === "ADMIN";
  const isClient = role === "CLIENT";

  // Financial totals for client banner
  const totalValue = projects.reduce((s, p) => s + Number(p.total_value), 0);
  const totalAdvance = projects.reduce((s, p) => s + (Number(p.total_value) * p.advance_percent) / 100, 0);
  const totalRemaining = totalValue - totalAdvance;

  // Client with no projects — show landing
  if (!loading && isClient && projects.length === 0) {
    return <ClientLanding />;
  }

  return (
    <div className="p-3 md:p-6 space-y-5">
      {/* Client financial banner (PASO 16) */}
      {isClient && projects.length > 0 && (
        <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #0A7881 0%, #68B2B7 60%, #9BE3BF 100%)" }}>
          <p className="text-sm font-medium text-white/80 mb-3">Resumen financiero de mis proyectos</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-white/70 mb-0.5">Valor total</p>
              <p className="text-lg font-bold">{COP.format(totalValue)}</p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-0.5">Anticipo</p>
              <p className="text-lg font-bold">{COP.format(totalAdvance)}</p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-0.5">Saldo</p>
              <p className="text-lg font-bold">{COP.format(totalRemaining)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Proyectos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasFilters ? `${filtered.length} de ${projects.length} proyectos` : `${projects.length} proyecto${projects.length !== 1 ? "s" : ""} en total`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-sd4a-dark text-white rounded-lg text-sm font-medium hover:bg-[#075e69] transition-colors"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo proyecto</span><span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:flex-wrap sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código o cliente..."
            className="pl-9 pr-8 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 focus:border-sd4a-mid w-full sm:w-72 text-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "ALL")}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50"
        >
          <option value="ALL">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
            className="text-xs px-3 py-2 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando proyectos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderKanban className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No hay proyectos que mostrar</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden card-shadow">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <Th field="name" label="Proyecto" current={sortField} dir={sortDir} onSort={handleSort} />
                  {isAdmin && <Th field="client_name" label="Cliente" current={sortField} dir={sortDir} onSort={handleSort} />}
                  <Th field="status" label="Estado" current={sortField} dir={sortDir} onSort={handleSort} />
                  <Th field="total_value" label="Valor" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
                  <Th field="progress" label="Avance" current={sortField} dir={sortDir} onSort={handleSort} align="center" />
                  <Th field="estimated_date" label="F. Inicio / Entrega" current={sortField} dir={sortDir} onSort={handleSort} />
                  {isAdmin && <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left">Ingeniero</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground block">{p.code}</span>
                      <span className="font-medium text-foreground">{p.name}</span>
                    </td>
                    {isAdmin && <td className="px-4 py-3 text-muted-foreground">{p.client_name}</td>}
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[p.status])}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums font-medium">{COP.format(Number(p.total_value))}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 bg-muted rounded-full h-1.5">
                          <div className="bg-sd4a-dark h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-7 text-right">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      <div className="space-y-0.5">
                        <div>{p.start_date ? new Date(p.start_date).toLocaleDateString("es-CO") : "—"}</div>
                        <div className="text-muted-foreground/60">{p.estimated_date ? new Date(p.estimated_date).toLocaleDateString("es-CO") : "—"}</div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {p.member_names.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <HardHat className="w-3 h-3 shrink-0" />
                            {p.member_names[0]}{p.member_names.length > 1 ? ` +${p.member_names.length - 1}` : ""}
                          </span>
                        ) : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((p) => (
              <div key={p.id} onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-sd4a-mid transition-colors card-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                    <p className="font-semibold text-foreground">{p.name}</p>
                    {isAdmin && <p className="text-xs text-muted-foreground">{p.client_name}</p>}
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium shrink-0", STATUS_COLORS[p.status])}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{COP.format(Number(p.total_value))}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-muted rounded-full h-1.5">
                      <div className="bg-sd4a-dark h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{p.progress}%</span>
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

function ClientLanding() {
  const steps = [
    { n: "1", title: "Consulta inicial", desc: "Nos reunimos para entender tu proyecto y necesidades." },
    { n: "2", title: "Propuesta técnica", desc: "Elaboramos una propuesta detallada con alcances, memorias de cálculo y costos." },
    { n: "3", title: "Anticipo y arranque", desc: "Con el anticipo aprobado, iniciamos el modelado y coordinación." },
    { n: "4", title: "Entrega y cierre", desc: "Revisión final, entrega de modelos y pago del saldo restante." },
  ];

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
        style={{ background: "linear-gradient(135deg, #0A7881, #9BE3BF)" }}>
        S
      </div>
      <div className="space-y-2 max-w-lg">
        <h1 className="text-2xl font-bold text-foreground">Bienvenido al Portal SD4A</h1>
        <p className="text-muted-foreground">Aún no tienes proyectos asignados. Cuando iniciemos tu proyecto, aparecerá aquí con toda la información de avance y pagos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl text-left">
        {steps.map((s) => (
          <div key={s.n} className="bg-card border border-border rounded-xl p-4 card-shadow flex gap-3">
            <div className="w-7 h-7 rounded-full bg-sd4a-dark text-white text-xs font-bold flex items-center justify-center shrink-0">{s.n}</div>
            <div>
              <p className="font-semibold text-foreground text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 card-shadow max-w-sm w-full text-left space-y-3">
        <p className="font-semibold text-foreground text-sm">¿Listo para comenzar?</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4 text-sd4a-dark" />
          <span>sd4asas@gmail.com</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4 text-sd4a-dark" />
          <span>Contáctanos para agendar una reunión</span>
        </div>
      </div>
    </div>
  );
}

function Th({ field, label, current, dir, onSort, align }: {
  field: SortField; label: string; current: SortField; dir: SortDir;
  onSort: (f: SortField) => void; align?: "right" | "center";
}) {
  const active = current === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={cn(
        "px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </span>
    </th>
  );
}
