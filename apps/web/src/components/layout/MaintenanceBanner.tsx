"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

const STORAGE_KEY = "sd4a-maintenance";
const EVENT_KEY = "sd4a-maintenance-change";

export function MaintenanceBanner({ isAdmin }: { isAdmin: boolean }) {
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setActive(localStorage.getItem(STORAGE_KEY) === "true");
    function onEvent() {
      setActive(localStorage.getItem(STORAGE_KEY) === "true");
      setVisible(true);
    }
    window.addEventListener(EVENT_KEY, onEvent);
    return () => window.removeEventListener(EVENT_KEY, onEvent);
  }, []);

  function deactivate() {
    localStorage.setItem(STORAGE_KEY, "false");
    window.dispatchEvent(new Event(EVENT_KEY));
  }

  if (!active || !visible) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="flex-1 text-sm text-amber-800 font-medium">
        El portal está en modo mantenimiento. Algunas funciones pueden no estar disponibles.
      </p>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <button
            onClick={deactivate}
            className="text-xs px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded-md font-medium transition-colors"
          >
            Desactivar
          </button>
        )}
        <button onClick={() => setVisible(false)} className="p-1 hover:bg-amber-100 rounded">
          <X className="w-3.5 h-3.5 text-amber-600" />
        </button>
      </div>
    </div>
  );
}

export function MaintenanceToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
        enabled
          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {enabled ? "Mantenimiento activo" : "Modo mantenimiento"}
    </button>
  );
}
