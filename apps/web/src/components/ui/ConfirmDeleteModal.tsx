"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

const CONFIRM_WORD = "ELIMINAR";

export function ConfirmDeleteModal({
  title, description, onCancel, onConfirm, loading,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#ef4444,#f87171)" }}>
          <AlertTriangle className="w-5 h-5 text-white shrink-0" />
          <p className="text-sm font-bold text-white">{title}</p>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>

          {step === 1 ? (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-red-600 border-2 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors"
              >
                Continuar
              </button>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="px-3.5 py-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                <p className="text-xs text-red-700 dark:text-red-300">
                  Esta acción no se puede deshacer. Escribe <span className="font-mono font-bold">{CONFIRM_WORD}</span> para confirmar.
                </p>
              </div>
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={CONFIRM_WORD}
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  disabled={typed.trim().toUpperCase() !== CONFIRM_WORD || loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
