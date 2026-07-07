"use client";

import { useState, useEffect, useCallback } from "react";
import { proxyFetch } from "@/lib/proxy-fetch";
import { Plus, Trash2, Loader2, HardHat, X, Eye, EyeOff, ShieldOff } from "lucide-react";

interface Engineer {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function EngineersPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await proxyFetch("/users?role=ENGINEER&limit=100");
    if (r.ok) {
      const data = await r.json();
      setEngineers(data.items ?? data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(eng: Engineer) {
    await proxyFetch(`/users/${eng.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !eng.is_active }),
    });
    load();
  }

  async function deleteEngineer(eng: Engineer) {
    if (!confirm(`¿Eliminar la cuenta de "${eng.name}"? Esta acción no se puede deshacer.`)) return;
    await proxyFetch(`/users/${eng.id}/memberships`, { method: "DELETE" });
    await proxyFetch(`/users/${eng.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Ingenieros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Cuentas de acceso del equipo técnico</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sd4a-dark text-white text-sm font-medium rounded-lg hover:bg-[#075e69] transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo ingeniero
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-sd4a-dark" />
        </div>
      ) : engineers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <HardHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay ingenieros registrados aún.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {engineers.map(eng => (
            <div key={eng.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${eng.is_active ? "bg-sd4a-dark/10" : "bg-muted"}`}>
                  <HardHat className={`w-4 h-4 ${eng.is_active ? "text-sd4a-dark" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{eng.name}</p>
                    {!eng.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactivo</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{eng.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(eng)}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-amber-500"
                  title={eng.is_active ? "Desactivar" : "Activar"}
                >
                  <ShieldOff className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteEngineer(eng)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateEngineerModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function CreateEngineerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    if (!email.trim()) { setError("El correo es requerido"); return; }
    if (password.length < 8) { setError("La contraseña debe tener mínimo 8 caracteres"); return; }
    setError(null);
    setLoading(true);
    const r = await proxyFetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role: "ENGINEER" }),
    });
    setLoading(false);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      setError(err.detail ?? "Error al crear el ingeniero");
      return;
    }
    onCreated();
  }

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 focus:border-sd4a-mid transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">Nuevo ingeniero</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nombre completo</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Juan Pérez" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Correo electrónico</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} placeholder="juan@sd4a.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Contraseña</label>
            <div className="relative">
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                className={inputCls + " pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Se enviará al correo del ingeniero al crearlo.</p>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-sd4a-dark text-white text-sm font-medium hover:bg-[#075e69] flex items-center justify-center gap-2 disabled:opacity-70 transition-colors">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crear ingeniero
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
