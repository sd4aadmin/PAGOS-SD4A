"use client";

import { proxyFetch } from "@/lib/proxy-fetch";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, Plus, ExternalLink, CheckCircle2, Loader2, RefreshCw, Pencil, Trash2 } from "lucide-react";
import {
  Payment, PaymentWithCheckout, PaymentType,
  PAYMENT_TYPE_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS
} from "@/types/payment";
import { Project } from "@/types/project";
import { cn } from "@/lib/utils";

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export function PaymentsSection({ project, role }: { project: Project; role: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/proxy/payments/project/${project.id}`);
    if (res.ok) setPayments(await res.json());
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = role === "ADMIN";
  const isClient = role === "CLIENT";

  const totalPaid = payments
    .filter((p) => p.status === "CONFIRMED")
    .reduce((s, p) => s + Number(p.amount), 0);

  const pendingPayments = payments.filter((p) => p.status === "PENDING");

  return (
    <div className="bg-card border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-sd4a-cyan" /> Pagos
        </h3>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 hover:bg-muted rounded-lg">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-sd4a-dark text-white rounded-lg hover:bg-[#075e69]"
            >
              <Plus className="w-3 h-3" /> Crear enlace de pago
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryItem label="Valor total" value={COP.format(Number(project.total_value))} />
        <SummaryItem label="Pagado" value={COP.format(totalPaid)} highlight="text-emerald-600" />
        <SummaryItem label="Por pagar" value={COP.format(Number(project.total_value) - totalPaid)} />
      </div>

      {/* Client pay buttons for pending payments */}
      {isClient && pendingPayments.length > 0 && (
        <div className="space-y-2">
          {pendingPayments.map((p) => (
            <ClientPayButton key={p.id} paymentId={p.id} amount={Number(p.amount)} type={p.type} />
          ))}
        </div>
      )}

      {/* Payments list */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Cargando...
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

      {showCreate && (
        <CreatePaymentModal project={project} totalPaid={totalPaid} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {editPayment && (
        <EditPaymentModal payment={editPayment} onClose={() => setEditPayment(null)} onSaved={load} />
      )}
    </div>
  );
}

function SummaryItem({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-sm font-semibold text-foreground", highlight)}>{value}</p>
    </div>
  );
}

function PaymentRow({ payment, isAdmin, onConfirmed, onEdit, onDeleted }: {
  payment: Payment; isAdmin: boolean;
  onConfirmed: () => void; onEdit: () => void; onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      if (res.ok || res.status === 204) {
        await onDeleted();
      } else {
        const text = await res.text().catch(() => "");
        let msg = "Error al eliminar el pago";
        try { msg = JSON.parse(text).detail ?? msg; } catch { if (text) msg = text; }
        alert(`Error ${res.status}: ${msg}`);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{PAYMENT_TYPE_LABELS[payment.type]}</span>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", PAYMENT_STATUS_COLORS[payment.status])}>
            {PAYMENT_STATUS_LABELS[payment.status]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-sm font-semibold text-foreground">{COP.format(Number(payment.amount))}</span>
          {payment.wompi_ref && <span className="text-xs text-muted-foreground font-mono">{payment.wompi_ref}</span>}
        </div>
        {payment.confirmed_at && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Confirmado {new Date(payment.confirmed_at).toLocaleDateString("es-CO")}
          </p>
        )}
        {payment.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{payment.notes}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        {isAdmin && payment.status === "PENDING" && (
          <>
            <button
              onClick={confirmPayment}
              disabled={confirming}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
            >
              {confirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Confirmar
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={del}
              disabled={deleting}
              className="p-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-50"
              title="Eliminar"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>
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

  const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

  return (
    <button
      onClick={pay}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 bg-sd4a-dark text-white rounded-xl font-medium hover:bg-[#075e69] disabled:opacity-70 transition-colors"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
      Pagar {PAYMENT_TYPE_LABELS[type]} — {COP.format(amount)}
    </button>
  );
}

// Helpers para formateo de monto con puntos (formato colombiano)
function formatAmountDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CO");
}
function parseAmountRaw(display: string): string {
  return display.replace(/\./g, "").replace(/\s/g, "");
}

function AmountInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const display = value ? formatAmountDisplay(value) : "";
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(parseAmountRaw(e.target.value))}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 bg-background text-foreground"
        placeholder={placeholder ?? "15.000.000"}
      />
      {value && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">COP</span>}
    </div>
  );
}

function EditPaymentModal({ payment, onClose, onSaved }: { payment: Payment; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<PaymentType>(payment.type as PaymentType);
  const [amount, setAmount] = useState(String(Math.round(Number(payment.amount))));
  const [notes, setNotes] = useState(payment.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/proxy/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: Number(amount), notes: notes || null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail ?? "Error al guardar");
      setLoading(false);
      return;
    }
    await onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="font-semibold text-foreground mb-4">Editar pago</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tipo de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {(["ADVANCE", "PARTIAL", "FINAL"] as PaymentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "py-2 text-xs font-medium rounded-lg border transition-colors",
                    type === t ? "bg-sd4a-dark text-white border-sd4a-dark" : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {PAYMENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Monto (COP)</label>
            <AmountInput value={amount} onChange={setAmount} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notas (opcional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 bg-background text-foreground"
              placeholder="Anticipo proyecto Torre Norte..."
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted/50">Cancelar</button>
            <button
              onClick={save}
              disabled={loading || !amount}
              className="flex-1 py-2 bg-sd4a-dark text-white rounded-lg text-sm font-medium hover:bg-[#075e69] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatePaymentModal({ project, totalPaid, onClose, onCreated }: { project: Project; totalPaid: number; onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<PaymentType>("ADVANCE");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="font-semibold text-foreground mb-1">Crear enlace de pago</h2>
        <p className="text-xs text-muted-foreground mb-5">{project.code} — {project.name}</p>

        {checkoutUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800">Enlace de pago generado exitosamente</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Comparte este enlace con el cliente:</p>
              <div className="flex gap-2">
                <input readOnly value={checkoutUrl} className="flex-1 px-3 py-2 border border-border rounded-lg text-xs bg-muted text-foreground truncate" />
                <button
                  onClick={() => navigator.clipboard.writeText(checkoutUrl)}
                  className="px-3 py-2 border rounded-lg text-xs hover:bg-muted/50"
                >
                  Copiar
                </button>
              </div>
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-sd4a-dark text-white rounded-xl text-sm font-medium hover:bg-[#075e69]"
              >
                <ExternalLink className="w-4 h-4" /> Abrir Wompi Checkout
              </a>
            </div>
            <button onClick={onClose} className="w-full py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted/50">
              Cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tipo de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {(["ADVANCE", "PARTIAL", "FINAL"] as PaymentType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => prefillAmount(t)}
                    className={cn(
                      "py-2 text-xs font-medium rounded-lg border transition-colors",
                      type === t ? "bg-sd4a-dark text-white border-sd4a-dark" : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {PAYMENT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              {type === "ADVANCE" && (
                <p className="text-xs text-muted-foreground mt-1">Sugerido: {COP.format(advanceAmount)} ({project.advance_percent}%)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Monto (COP)</label>
              <AmountInput value={amount} onChange={setAmount} />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Notas (opcional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 bg-background text-foreground"
                placeholder="Anticipo proyecto Torre Norte..."
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted/50">Cancelar</button>
              <button
                onClick={create}
                disabled={loading || !amount}
                className="flex-1 py-2 bg-sd4a-dark text-white rounded-lg text-sm font-medium hover:bg-[#075e69] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Generar enlace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
