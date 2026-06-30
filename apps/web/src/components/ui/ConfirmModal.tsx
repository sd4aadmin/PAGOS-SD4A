"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

type Variant = "destructive" | "warning";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: Variant;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, description, confirmLabel = "Confirmar", variant = "destructive", onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  async function handle() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  const btnCls = variant === "destructive"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-amber-500 hover:bg-amber-600 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 card-shadow-md">
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-lg ${variant === "destructive" ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
            <AlertTriangle className={`w-5 h-5 ${variant === "destructive" ? "text-red-600" : "text-amber-600"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors text-foreground">
            Cancelar
          </button>
          <button onClick={handle} disabled={loading} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${btnCls} disabled:opacity-60`}>
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
