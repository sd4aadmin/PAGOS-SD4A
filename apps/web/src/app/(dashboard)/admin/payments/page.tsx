"use client";

import { proxyFetch } from "@/lib/proxy-fetch";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard, RefreshCw, CheckCircle2, Loader2, Search, ArrowUpRight,
  ChevronDown, X, TrendingUp, Clock, AlertCircle, Banknote, Plus,
  ExternalLink, Copy, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PAYMENT_TYPE_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PaymentType } from "@/types/payment";
import { Pagination } from "@/components/ui/Pagination";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const PAGE_SIZE = 15;

type PaymentRow = {
  id: string; project_id: string; project_name: string | null; project_code: string | null;
  user_id: string; type: string; status: string; amount: string;
  wompi_ref: string | null; wompi_id: string | null; confirmed_at: string | null;
  notes: string | null; created_at: string; updated_at: string; project_remaining: string;
};

type ProjectOption = { id: string; code: string; name: string; total_value: string; advance_percent: number };

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "FAILED"] as const;

export default function PaymentsAdminPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await proxyFetch("/payments");
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
      }
    } catch { /* network error */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirm(paymentId: string) {
    setConfirming(paymentId);
    try {
      await proxyFetch(`/payments/${paymentId}/confirm`, { method: "POST" });
      await load();
    } finally { setConfirming(null); }
  }

  async function changeStatus(paymentId: string, newStatus: string) {
    setChangingStatus(paymentId);
    try {
      await proxyFetch(`/payments/${paymentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } finally { setChangingStatus(null); }
  }

  const hasFilters = search.trim() !== "" || statusFilter !== "ALL";
  const filtered = payments.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (p.wompi_ref ?? "").toLowerCase().includes(q) ||
        (p.project_code ?? "").toLowerCase().includes(q) ||
        (p.project_name ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalConfirmed = payments.filter((p) => p.status === "CONFIRMED").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === "PENDING").reduce((s, p) => s + Number(p.amount), 0);
  const byType = {
    ADVANCE: payments.filter((p) => p.type === "ADVANCE" && p.status === "CONFIRMED").reduce((s, p) => s + Number(p.amount), 0),
    PARTIAL: payments.filter((p) => p.type === "PARTIAL" && p.status === "CONFIRMED").reduce((s, p) => s + Number(p.amount), 0),
    FINAL:   payments.filter((p) => p.type === "FINAL"   && p.status === "CONFIRMED").reduce((s, p) => s + Number(p.amount), 0),
  };

  return (
    <div className="p-3 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pagos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasFilters ? `${filtered.length} de ${payments.length} pagos` : `${payments.length} pago${payments.length !== 1 ? "s" : ""} en total`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #0A7881, #68B2B7)" }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo pago</span>
          </button>
        </div>
      </div>

      {/* Banner recaudo */}
      {!loading && payments.length > 0 && (
        <div className="rounded-xl p-4 md:p-5 text-white" style={{ background: "linear-gradient(135deg, #0A7881 0%, #68B2B7 60%, #9BE3BF 100%)" }}>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-3">Total recaudado confirmado</p>
          <p className="text-2xl md:text-3xl font-bold mb-4">{COP.format(totalConfirmed)}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/15 rounded-lg p-3">
              <p className="text-white/70 text-[11px] mb-1">Anticipos</p>
              <p className="font-bold text-sm">{COP.format(byType.ADVANCE)}</p>
            </div>
            <div className="bg-white/15 rounded-lg p-3">
              <p className="text-white/70 text-[11px] mb-1">Parciales</p>
              <p className="font-bold text-sm">{COP.format(byType.PARTIAL)}</p>
            </div>
            <div className="bg-white/15 rounded-lg p-3">
              <p className="text-white/70 text-[11px] mb-1">Finales</p>
              <p className="font-bold text-sm">{COP.format(byType.FINAL)}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2"><Banknote className="w-4 h-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total pagos</p></div>
          <p className="text-2xl font-bold text-foreground">{payments.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-500" /><p className="text-xs text-emerald-600 dark:text-emerald-400">Confirmados</p></div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{payments.filter(p => p.status === "CONFIRMED").length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-500" /><p className="text-xs text-amber-600 dark:text-amber-400">Pendientes</p></div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{COP.format(totalPending)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-red-500" /><p className="text-xs text-red-600 dark:text-red-400">Fallidos</p></div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{payments.filter(p => p.status === "FAILED").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:flex-wrap sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por referencia o proyecto..."
            className="pl-9 pr-8 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 focus:border-sd4a-mid w-full sm:w-72"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50"
        >
          <option value="ALL">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="FAILED">Fallido</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("ALL"); setPage(1); }}
            className="text-xs px-3 py-2 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Table / Empty */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando pagos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0A788120, #68B2B720)" }}>
            <CreditCard className="w-8 h-8" style={{ color: "#0A7881" }} />
          </div>
          <div>
            <p className="font-semibold text-foreground">No hay pagos registrados</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Crea un enlace de pago para un proyecto y envíaselo al cliente para que realice el pago.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #0A7881, #68B2B7)" }}
          >
            <Plus className="w-4 h-4" /> Crear primer pago
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto card-shadow">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Proyecto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Referencia</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Monto</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Por pagar</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => router.push(`/dashboard/projects/${p.project_id}`)} className="text-left group">
                      <p className="font-medium text-foreground group-hover:text-sd4a-dark flex items-center gap-1">
                        {p.project_name ?? p.project_code ?? p.project_id}
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                      {p.project_name && <p className="font-mono text-xs text-muted-foreground">{p.project_code}</p>}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.wompi_ref ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">
                    {PAYMENT_TYPE_LABELS[p.type as keyof typeof PAYMENT_TYPE_LABELS] ?? p.type}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      PAYMENT_STATUS_COLORS[p.status as keyof typeof PAYMENT_STATUS_COLORS] ?? "bg-muted text-muted-foreground"
                    )}>
                      {PAYMENT_STATUS_LABELS[p.status as keyof typeof PAYMENT_STATUS_LABELS] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                    {COP.format(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(p.project_remaining) > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">{COP.format(Number(p.project_remaining))}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Pagado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.confirmed_at
                      ? new Date(p.confirmed_at).toLocaleDateString("es-CO")
                      : new Date(p.created_at).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.status === "PENDING" && (
                        <button
                          onClick={() => confirm(p.id)}
                          disabled={confirming === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition-colors"
                        >
                          {confirming === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Confirmar
                        </button>
                      )}
                      <StatusDropdown
                        currentStatus={p.status}
                        loading={changingStatus === p.id}
                        onChange={(s) => changeStatus(p.id, s)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      )}

      {showCreate && <CreatePaymentModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

// ─── CREATE PAYMENT MODAL ────────────────────────────────────────────────────

function formatAmt(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d ? Number(d).toLocaleString("es-CO") : "";
}
function parseAmt(display: string) { return display.replace(/\./g, "").replace(/\s/g, ""); }

function CreatePaymentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [type, setType] = useState<PaymentType>("ADVANCE");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    proxyFetch("/projects")
      .then(r => r.json())
      .then(data => { setProjects(Array.isArray(data) ? data : []); setLoadingProjects(false); })
      .catch(() => setLoadingProjects(false));
  }, []);

  function selectProject(p: ProjectOption) {
    setSelectedProject(p);
    setAmount(String(Math.round((Number(p.total_value) * p.advance_percent) / 100)));
  }

  function prefillType(t: PaymentType) {
    setType(t);
    if (!selectedProject) return;
    if (t === "ADVANCE") setAmount(String(Math.round((Number(selectedProject.total_value) * selectedProject.advance_percent) / 100)));
    else if (t === "FINAL") setAmount(String(Math.round(Number(selectedProject.total_value))));
    else setAmount("");
  }

  async function create() {
    if (!selectedProject || !amount) return;
    setError(null);
    setLoading(true);
    const res = await proxyFetch("/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: selectedProject.id, type, amount: Number(amount), notes: notes || null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail ?? "Error al crear el pago");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCheckoutUrl(data.checkout_url);
    await onCreated();
    setLoading(false);
  }

  async function copyUrl() {
    if (!checkoutUrl) return;
    await navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between px-5 py-4 border-b border-border rounded-t-2xl sm:rounded-t-2xl">
          <div>
            <h2 className="font-semibold text-foreground">Nuevo enlace de pago</h2>
            {selectedProject && <p className="text-xs text-muted-foreground mt-0.5">{selectedProject.code} — {selectedProject.name}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {checkoutUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-800 dark:text-emerald-300">Enlace generado. El cliente recibirá un correo automáticamente.</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Enlace de pago Wompi:</p>
                <div className="flex gap-2">
                  <input readOnly value={checkoutUrl} className="flex-1 px-3 py-2 border border-border rounded-lg text-xs bg-muted text-foreground truncate" />
                  <button onClick={copyUrl} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-muted transition-colors shrink-0">
                    {copied ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                  </button>
                </div>
              </div>
              <a
                href={checkoutUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #0A7881, #68B2B7)" }}
              >
                <ExternalLink className="w-4 h-4" /> Abrir Wompi Checkout
              </a>
              <button onClick={onClose} className="w-full py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {/* Project selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Proyecto</label>
                {loadingProjects ? (
                  <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Cargando proyectos...</div>
                ) : (
                  <select
                    value={selectedProject?.id ?? ""}
                    onChange={(e) => {
                      const p = projects.find(p => p.id === e.target.value);
                      if (p) selectProject(p);
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50"
                  >
                    <option value="">Seleccionar proyecto...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Tipo de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ADVANCE", "PARTIAL", "FINAL"] as PaymentType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => prefillType(t)}
                      className={cn(
                        "py-2 text-xs font-medium rounded-lg border transition-colors",
                        type === t ? "text-white border-transparent" : "text-muted-foreground hover:bg-muted/50"
                      )}
                      style={type === t ? { background: "linear-gradient(135deg, #0A7881, #68B2B7)" } : {}}
                    >
                      {PAYMENT_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                {selectedProject && type === "ADVANCE" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Anticipo sugerido: {COP.format((Number(selectedProject.total_value) * selectedProject.advance_percent) / 100)} ({selectedProject.advance_percent}%)
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Monto (COP)</label>
                <div className="relative">
                  <input
                    type="text" inputMode="numeric"
                    value={formatAmt(amount)}
                    onChange={(e) => setAmount(parseAmt(e.target.value))}
                    placeholder="15.000.000"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50"
                  />
                  {amount && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">COP</span>}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notas (opcional)</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anticipo proyecto Torre Norte..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50"
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={create}
                  disabled={loading || !amount || !selectedProject}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #0A7881, #68B2B7)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Generar enlace
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STATUS DROPDOWN ─────────────────────────────────────────────────────────

function StatusDropdown({ currentStatus, loading, onChange }: {
  currentStatus: string; loading: boolean; onChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
    }
    setOpen(!open);
  }

  return (
    <div>
      <button ref={btnRef} onClick={toggle} disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-50 text-foreground transition-colors">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
        Estado
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-36 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
            style={{ top: pos.top, right: pos.right }}>
            {STATUS_OPTIONS.map((s) => (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className={cn("w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground", s === currentStatus && "bg-muted font-medium")}>
                {PAYMENT_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
