"use client";

import { useCallback, useEffect, useState } from "react";
import { FileDiff, Loader2, Plus, Trash2, X } from "lucide-react";
import { proxyFetch } from "@/lib/proxy-fetch";
import { apiErrorMessage, NETWORK_ERROR_MESSAGE } from "@/lib/errors";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDialog } from "@/components/ui/useDialog";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";

type Responsible = "CLIENT" | "SD4A";

interface ProjectChange {
  id: string;
  description: string;
  responsible: Responsible;
  amount: string | number;
  charged: boolean;
  created_by_name: string | null;
  created_at: string;
}

/**
 * Solicitudes de cambio de un proyecto. Solo el administrador las registra; el cliente
 * las ve y recibe un correo. Un cambio a cargo del cliente suma su valor al del proyecto;
 * uno por error de SD4A queda registrado sin cobro.
 */
export function ChangesSection({
  projectId, role, onChanged,
}: { projectId: string; role: string; onChanged: () => void }) {
  const isAdmin = role === "ADMIN";
  const [changes, setChanges] = useState<ProjectChange[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toDelete, setToDelete] = useState<ProjectChange | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await proxyFetch(`/projects/${projectId}/changes`);
      if (!res.ok) { setLoadError(await apiErrorMessage(res, "No se pudieron cargar los cambios.")); return; }
      setChanges(await res.json());
      setLoadError(null);
    } catch {
      setLoadError(NETWORK_ERROR_MESSAGE);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await proxyFetch(`/projects/${projectId}/changes/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        setDeleteError(await apiErrorMessage(res, "No se pudo eliminar el cambio."));
        return;
      }
      setToDelete(null);
      await load();
      onChanged();
    } catch {
      setDeleteError(NETWORK_ERROR_MESSAGE);
    } finally {
      setDeleting(false);
    }
  }

  const chargedTotal = (changes ?? []).reduce((sum, c) => sum + (c.charged ? Number(c.amount) : 0), 0);

  return (
    <section aria-labelledby="changes-title" className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 id="changes-title" className="font-bold text-foreground flex items-center gap-2">
            <FileDiff className="w-4 h-4" style={{ color: "#0A7881" }} aria-hidden="true" /> Solicitudes de cambio
          </h3>
          {chargedTotal > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Cambios cobrados sumados al valor del proyecto: <strong className="text-foreground">{formatCurrency(chargedTotal)}</strong>
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Registrar cambio
          </button>
        )}
      </div>

      {loadError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
      {!loadError && changes === null && (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Cargando…</p>
      )}
      {changes && changes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Aún no hay cambios registrados. Usa «Registrar cambio» cuando se acuerde uno con el cliente." : "No hay cambios registrados en este proyecto."}
        </p>
      )}

      {changes && changes.length > 0 && (
        <ul className="divide-y divide-border">
          {changes.map((c) => (
            <li key={c.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground break-words">{c.description}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span
                    className={
                      "px-2 py-0.5 rounded-full font-semibold " +
                      (c.responsible === "CLIENT"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300")
                    }
                  >
                    {c.responsible === "CLIENT" ? "A cargo del cliente" : "SD4A · sin costo"}
                  </span>
                  <span>{formatDate(c.created_at)}</span>
                  {isAdmin && c.created_by_name && <span>Registró: {c.created_by_name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={"text-sm font-bold " + (c.charged ? "text-foreground" : "text-emerald-600")}>
                  {c.charged ? `+${formatCurrency(Number(c.amount))}` : "Sin costo"}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => { setDeleteError(null); setToDelete(c); }}
                    aria-label="Eliminar este cambio"
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <ChangeModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onCreated={async () => { setShowModal(false); await load(); onChanged(); }}
        />
      )}

      {toDelete && (
        <ConfirmDeleteModal
          title="Eliminar cambio"
          description={
            toDelete.charged
              ? `Vas a eliminar este cambio y se restarán ${formatCurrency(Number(toDelete.amount))} del valor del proyecto. Úsalo solo si lo registraste por error.`
              : "Vas a eliminar este cambio del historial del proyecto. No afecta el valor, porque estaba a cargo de SD4A y no tenía cobro."
          }
          loading={deleting}
          error={deleteError}
          onCancel={() => { setToDelete(null); setDeleteError(null); }}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  );
}

function ChangeModal({
  projectId, onClose, onCreated,
}: { projectId: string; onClose: () => void; onCreated: () => void }) {
  const dialog = useDialog(onClose);
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState<Responsible>("CLIENT");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNumber = Number(amount);
  const valid = description.trim().length >= 3 && (responsible === "SD4A" || amountNumber > 0);

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await proxyFetch(`/projects/${projectId}/changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          responsible,
          amount: responsible === "CLIENT" ? amountNumber : 0,
        }),
      });
      if (!res.ok) { setError(await apiErrorMessage(res, "No se pudo registrar el cambio.")); return; }
      await onCreated();
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  const option = (value: Responsible, title: string, hint: string) => (
    <label
      className={
        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors " +
        (responsible === value ? "border-[#0A7881] bg-[#0A7881]/5" : "border-border hover:bg-muted/50")
      }
    >
      <input
        type="radio" name="responsible" value={value} checked={responsible === value}
        onChange={() => setResponsible(value)} className="mt-1 accent-[#0A7881]"
      />
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );

  return (
    <div {...dialog.overlayProps} className="modal-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div {...dialog.panelProps} className="modal-panel outline-none bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id={dialog.titleId} className="font-semibold text-foreground">Registrar cambio</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label htmlFor="change-description" className="block text-sm font-medium text-foreground mb-1.5">¿Qué cambio se hizo?</label>
            <textarea
              id="change-description" value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} maxLength={1000} autoFocus placeholder="Ej.: Se agregó un piso al bloque B"
              className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 focus:border-[#0A7881] resize-none"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-foreground mb-1.5">¿A quién corresponde?</legend>
            <div className="space-y-2">
              {option("CLIENT", "Al cliente", "Se cobra: el valor se suma al valor del proyecto.")}
              {option("SD4A", "A SD4A", "No se cobra. Queda registrado y el cliente lo ve.")}
            </div>
          </fieldset>

          {responsible === "CLIENT" && (
            <div>
              <label htmlFor="change-amount" className="block text-sm font-medium text-foreground mb-1.5">Valor del cambio (COP)</label>
              <input
                id="change-amount" type="number" inputMode="numeric" min={1} value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="2500000"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#0A7881]/30 focus:border-[#0A7881]"
              />
              {amountNumber > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">Se sumarán {formatCurrency(amountNumber)} al valor del proyecto.</p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">Al registrarlo, el cliente recibe un correo con el detalle.</p>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              onClick={submit} disabled={!valid || saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
              style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Registrar y notificar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
