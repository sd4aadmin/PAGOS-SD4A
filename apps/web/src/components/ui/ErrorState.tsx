"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export function ErrorState({
  message = "No pudimos conectar con el servidor. Puede estar iniciando — intenta de nuevo en unos segundos.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.10)" }}
      >
        <WifiOff className="w-6 h-6 text-red-500" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="font-bold text-foreground">Error de conexión</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)", boxShadow: "0 4px 14px rgba(10,120,129,0.35)" }}
      >
        <RefreshCw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );
}
