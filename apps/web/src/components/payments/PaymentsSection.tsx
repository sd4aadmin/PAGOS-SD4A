"use client";

import { proxyFetch } from "@/lib/proxy-fetch";
import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Plus, ExternalLink, CheckCircle2, Loader2,
  RefreshCw, Pencil, Trash2, DollarSign,
} from "lucide-react";
import {
  Payment, PaymentWithCheckout, PaymentType,
  PAYMENT_TYPE_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
} from "@/types/payment";
import { Project } from "@/types/project";
import { cn } from "@/lib/utils";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export function PaymentsSection({ project, role }: { project: Project; role: string }) {
  const [payments, setPayments]       = useState<Payment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/proxy/payments/project/${project.id}`);
    if (res.ok) setPayments(await res.json());
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const isAdmin  = role === "ADMIN";
  const isClient = role === "CLIENT";

  const totalPaid    = payments.filter(p => p.status === "CONFIRMED").reduce((s, p) => s + Number(p.amount), 0);
  const totalValue   = Number(project.total_value);
  const remaining    = totalValue - totalPaid;
  const paidPct      = totalValue > 0 ? Math.round((totalPaid / totalValue) * 100) : 0;
  const pendingPay   = payments.filter(p => p.status === "PENDING");

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-4 h-4" style={{ color: "#0A7881" }} /> Pagos
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
            >
              <Plus className="w-3 h-3" /> Crear enlace
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Resumen financiero */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Valor total"  value={COP.format(totalValue)} icon={<DollarSign className="w-4 h-4" />} color="#0A7881" bg="#f0fdfa" />
          <SummaryCard label="Pagado"       value={COP.format(totalPaid)}  icon={<CheckCircle2 className="w-4 h-4" />} color="#059669" bg="#d1fae5" />
          <SummaryCard label="Por pagar"    value={COP.format(remaining)}  icon={<CreditCard className="w-4 h-4" />} color="#d97706" bg="#fef3c7" />
        </div>

        {/* Barra de progreso de pagos */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progreso de pago</span>
            <span className="font-bold text-foreground">{paidPct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${paidPct}%`, background: "linear-gradient(90deg,#0A7881,#9BE3BF)" }}
            />
          </div>
        </div>

        {/* Botones de pago para cliente */}
        {isClient && pendingPay.length > 0 && (
          <div className="space-y-2">
            {pendingPay.map((p) => (
              <ClientPayButton key={p.id} paymentId={p.id} amount={Number(p.amount)} type={p.type} />
            ))}
          </div>
        )}

        {/* Lista de pagos */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Cargando…
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No hay pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} isAdmin={isAdmin} onConfirmed={load} onEdit={() => setEditPayment(p)} onDeleted={load} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePaymentModal project={project} totalPaid={totalPaid} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {editPayment && (
        <EditPaymentModal payment={editPayment} onClose={() => setEditPayment(null)} onSaved={load} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color, bg }: { label: string; value: string; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className="rounded-xl p-3 border border-border">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color }}>
          <span className="scale-75">{icon}</span>
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-black text-foreground leading-tight">{value}</p>
    </div>
  );
}

function PaymentRow({ payment, isAdmin, onConfirmed, onEdit, onDeleted }: {
  payment: Payment; isAdmin: boolean;
  onConfirmed: () => void; onEdit: () => void; onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  async function confirmPayment() {
    setConfirming(true);
    await fetch(`/api/proxy/payments/${payment.id}/confirm`, { method: "POST" });
    await onConfirmed();
    setConfirming(false);
  }

  async function del() {
    if (!window.confirm(`¿Eliminar este pago de ${COP.format(Number(payment.amount))}? No se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const res = await proxyFetch(`/payments/${payment.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) { await onDeleted(); }
      else {
        const text = await res.text().catch(() => "");
        let msg = "Error al eliminar el pago";
        try { msg = JSON.parse(text).detail ?? msg; } catch { if (text) msg = text; }
        alert(`Error ${res.status}: ${msg}`);
      }
    } finally { setDeleting(false); }
  }

  return (
    <div className="flex items-center gap-3 p-3.5 border border-border rounded-xl hover:bg-muted/20 transition-colors">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#f0fdfa" }}>
        <CreditCard className="w-4 h-4" style={{ color: "#0A7881" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{PAYMENT_TYPE_LABELS[payment.type]}</span>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", PAYMENT_STATUS_COLORS[payment.status])}>
            {PAYMENT_STATUS_LABELS[payment.status]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-sm font-black text-foreground">{COP.format(Number(payment.amount))}</span>
          {payment.wompi_ref && <span className="text-xs text-muted-foreground font-mono">{payment.wompi_ref}</span>}
        </div>
        {payment.confirmed_at && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Confirmado {new Date(payment.confirmed_at).toLocaleDateString("es-CO")}
          </p>
        )}
        {payment.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{payment.notes}</p>}
      </div>
      {isAdmin && payment.status === "PENDING" && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={confirmPayment}
            disabled={confirming}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-emerald-300 text-emerald-700 rounded-xl hover:bg-emerald-50 disabled:opacity-50 transition-colors"
          >
            {confirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            <span className="hidden sm:inline">Confirmar</span>
          </button>
          <button onClick={onEdit} className="p-1.5 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-colors" title="Editar">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={del} disabled={deleting} className="p-1.5 border border-red-200 rounded-xl hover:bg-red-50 text-red-500 disabled:opacity-50 transition-colors" title="Eliminar">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

function ClientPayButton({ paymentId, amount, type }: { paymentId: string; amount: number; type: PaymentType }) {
  const [loading, setLoading] = useState(false);

  async function pay() {
    setLoading(true);
    const res = await fetch(`/api/proxy/payments/${paymentId}/checkout`);
    if (res.ok) {
      const data: PaymentWithCheckout = await res.json();
      window.location.href = data.checkout_url;
    }
    setLoading(false);
  }

  return (
    <button
      onClick={pay}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-70 transition-opacity"
      style={{ background: "linear-gradient(135deg,#0A7881,#9BE3BF)", boxShadow: "0 4px 14px rgba(10,120,129,0.3)" }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
      Pagar {PAYMENT_TYPE_LABELS[type]} — {COP.format(amount)}
    </button>
  );
}

/* ── Helpers de monto ── */
function formatAmountDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("es-CO") : "";
}
function parseAmountRaw(display: string): string {
  return display.replace(/\./g, "").replace(/\s/g, "");
}

function AmountInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const display = value ? formatAmountDisplay(value) : "";
  return (
    <div className="relative">
      <input
        type="text" inputMode="numeric"
        value={display}
        onChange={(e) => onChange(parseAmountRaw(e.target.value))}
        className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 focus:border-[#0A7881] bg-background text-foreground transition"
        placeholder={placeholder ?? "15.000.000"}
      />
      {value && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">COP</span>}
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function TypeSelector({ value, onChange }: { value: PaymentType; onChange: (t: PaymentType) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(["ADVANCE", "PARTIAL", "FINAL"] as PaymentType[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "py-2.5 text-xs font-bold rounded-xl border transition-all",
            value === t
              ? "text-white border-transparent"
              : "text-muted-foreground border-border hover:bg-muted"
          )}
          style={value === t ? { background: "linear-gradient(135deg,#0A7881,#68B2B7)" } : {}}
        >
          {PAYMENT_TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

function EditPaymentModal({ payment, onClose, onSaved }: { payment: Payment; onClose: () => void; onSaved: () => void }) {
  const [type, setType]     = useState<PaymentType>(payment.type as PaymentType);
  const [amount, setAmount] = useState(String(Math.round(Number(payment.amount))));
  const [notes, setNotes]   = useState(payment.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function save() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/proxy/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: Number(amount), notes: notes || null }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); setError(err.detail ?? "Error al guardar"); setLoading(false); return; }
    await onSaved();
    onClose();
  }

  return (
    <ModalShell title="Editar pago" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-muted-foreground">Tipo de pago</label>
          <TypeSelector value={type} onChange={setType} />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest text-muted-foreground">Monto (COP)</label>
          <AmountInput value={amount} onChange={setAmount} />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest text-muted-foreground">Notas (opcional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 bg-background text-foreground"
            placeholder="Anticipo proyecto Torre Norte…" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={save} disabled={loading || !amount}
            className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity"
            style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function CreatePaymentModal({ project, totalPaid, onClose, onCreated }: {
  project: Project; totalPaid: number; onClose: () => void; onCreated: () => void;
}) {
  const [type, setType]         = useState<PaymentType>("ADVANCE");
  const [amount, setAmount]     = useState("");
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const advanceAmount = (Number(project.total_value) * project.advance_percent) / 100;

  function prefillAmount(t: PaymentType) {
    setType(t);
    const remaining = Number(project.total_value) - totalPaid;
    if (t === "ADVANCE") setAmount(String(Math.round(advanceAmount)));
    else if (t === "FINAL") setAmount(String(remaining > 0 ? Math.round(remaining) : 0));
    else setAmount("");
  }

  async function create() {
    setError(null);
    setLoading(true);
    const res = await proxyFetch("/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: project.id, type, amount: Number(amount), notes: notes || null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail ?? "Error al crear el pago");
      setLoading(false);
      return;
    }
    const data: PaymentWithCheckout = await res.json();
    setCheckoutUrl(data.checkout_url);
    await onCreated();
    setLoading(false);
  }

  return (
    <ModalShell title="Crear enlace de pago" subtitle={`${project.code} — ${project.name}`} onClose={onClose}>
      {checkoutUrl ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#d1fae5", border: "1px solid #a7f3d0" }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 font-semibold">Enlace generado exitosamente</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Comparte este enlace con el cliente:</p>
            <div className="flex gap-2">
              <input readOnly value={checkoutUrl}
                className="flex-1 px-3 py-2 border border-border rounded-xl text-xs bg-muted text-foreground truncate" />
              <button onClick={() => navigator.clipboard.writeText(checkoutUrl)}
                className="px-3 py-2 border border-border rounded-xl text-xs hover:bg-muted transition-colors font-semibold">
                Copiar
              </button>
            </div>
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}>
              <ExternalLink className="w-4 h-4" /> Abrir Wompi Checkout
            </a>
          </div>
          <button onClick={onClose} className="w-full py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cerrar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-muted-foreground">Tipo de pago</label>
            <TypeSelector value={type} onChange={prefillAmount} />
            {type === "ADVANCE" && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Sugerido: {COP.format(advanceAmount)} ({project.advance_percent}%)
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest text-muted-foreground">Monto (COP)</label>
            <AmountInput value={amount} onChange={setAmount} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest text-muted-foreground">Notas (opcional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 bg-background text-foreground"
              placeholder="Anticipo proyecto Torre Norte…" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
            <button onClick={create} disabled={loading || !amount}
              className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Generar enlace
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
