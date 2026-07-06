"use client";

import { proxyFetch } from "@/lib/proxy-fetch";
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";

const SEEN_KEY = "sd4a-notif-seen";

const ACTION_LABELS: Record<string, string> = {
  PROJECT_CREATED: "Proyecto creado",
  PROJECT_UPDATED: "Proyecto actualizado",
  PROJECT_DELETED: "Proyecto eliminado",
  PAYMENT_CREATED: "Pago generado",
  PAYMENT_CONFIRMED: "Pago confirmado",
  PAYMENT_STATUS_UPDATED: "Estado de pago modificado",
  DELIVERABLE_UPLOADED: "Entregable subido",
  DELIVERABLE_DOWNLOADED: "Entregable descargado",
  DELIVERABLE_DELETED: "Entregable eliminado",
  USER_CREATED: "Usuario creado",
  USER_UPDATED: "Usuario actualizado",
  LOGIN: "Inicio de sesión",
};

export function NotificationBell() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    setSeen(new Set(stored));
  }, []);

  async function load() {
    const res = await proxyFetch("/activity?limit=20");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
    const allIds = items.map((i) => i.id);
    const newSeen = new Set([...seen, ...allIds]);
    setSeen(newSeen);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...newSeen]));
  }

  const unread = items.filter((i) => !seen.has(i.id)).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed md:absolute left-2 right-2 md:left-auto md:right-0 top-16 md:top-10 w-auto md:w-80 bg-card border border-border rounded-xl card-shadow-md z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Notificaciones</p>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin actividad reciente</p>
            ) : items.map((item) => (
              <div
                key={item.id}
                className={`px-4 py-3 text-sm transition-colors ${seen.has(item.id) ? "opacity-60" : "bg-sd4a-dark/5"}`}
              >
                <p className="text-foreground font-medium">{ACTION_LABELS[item.action] ?? item.action}</p>
                <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
