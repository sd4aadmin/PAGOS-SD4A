"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard, RefreshCw, CheckCircle2, Loader2, Search, ArrowUpRight, ChevronDown, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PAYMENT_TYPE_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/types/payment";
import { Pagination } from "@/components/ui/Pagination";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const PAGE_SIZE = 15;

type PaymentRow = {
  id: string;
  project_id: string;
  project_name: string | null;
  project_code: string | null;
  user_id: string;
  type: string;
  status: string;
  amount: string;
  wompi_ref: string | null;
  wompi_id: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  project_remaining: string;
};

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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/proxy/payments");
    if (res.ok) setPayments(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirm(paymentId: string) {
    setConfirming(paymentId);
    await fetch(`/api/proxy/payments/${paymentId}/confirm`, { method: "POST" });
    await load();
    setConfirming(null);
  }

  async function changeStatus(paymentId: string, newStatus: string) {
    setChangingStatus(paymentId);
    await fetch(`/api/proxy/payments/${paymentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await load();
    setChangingStatus(null);
  }

  const hasFilters = search.trim() !== "" || statusFilter !== "ALL";

  const filtered = payments.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (p.wompi_ref ?? "").toLowerCase().includes(q) ||
        (p.project_code ?? "").toLowerCase().includes(q) ||
        (p.project_name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalConfirmed = payments.filter((p) => p.status === "CONFIRMED").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === "PENDING").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-3 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pagos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasFilters ? `${filtered.length} de ${payments.length} pagos` : `${payments.length} pago${payments.length !== 1 ? "s" : ""} en total`}
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 card-shadow">
          <p className="text-xs text-muted-foreground mb-1">Total pagos</p>
          <p className="text-2xl font-bold text-foreground">{payments.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-shadow">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Confirmado</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{COP.format(totalConfirmed)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-shadow">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Pendiente de pago</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{COP.format(totalPending)}</p>
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
            <X className="w-3 h-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando pagos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CreditCard className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No hay pagos que mostrar</p>
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
                      <span className="text-amber-600 font-medium">{COP.format(Number(p.project_remaining))}</span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Pagado</span>
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
    </div>
  );
}

function StatusDropdown({ currentStatus, loading, onChange }: {
  currentStatus: string;
  loading: boolean;
  onChange: (s: string) => void;
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
      <button
        ref={btnRef}
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-50 text-foreground transition-colors"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
        Estado
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-36 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
            style={{ top: pos.top, right: pos.right }}
          >
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground",
                  s === currentStatus && "bg-muted font-medium"
                )}
              >
                {PAYMENT_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
