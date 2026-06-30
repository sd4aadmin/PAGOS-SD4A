"use client";
import { AlertTriangle } from "lucide-react";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <AlertTriangle className="w-12 h-12 text-destructive" />
      <h2 className="text-xl font-bold text-foreground">Algo salió mal</h2>
      <div className="flex gap-3">
        <button onClick={reset} className="px-4 py-2 bg-sd4a-dark text-white rounded-lg text-sm font-semibold">
          Intentar de nuevo
        </button>
        <a href="/dashboard" className="px-4 py-2 border border-border rounded-lg text-sm">
          Ir al dashboard
        </a>
      </div>
    </div>
  );
}
