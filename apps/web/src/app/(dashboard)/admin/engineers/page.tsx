"use client";

import { useState, useEffect, useCallback } from "react";
import { proxyFetch } from "@/lib/proxy-fetch";
import { Plus, Trash2, Pencil, Loader2, HardHat, X } from "lucide-react";

interface EngineerProfile {
  id: string;
  name: string;
  email?: string | null;
  created_at: string;
}

export default function EngineersPage() {
  const [profiles, setProfiles] = useState<EngineerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EngineerProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await proxyFetch("/engineer-profiles");
    if (r.ok) setProfiles(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteProfile(id: string, name: string) {
    if (!confirm(`¿Eliminar el perfil "${name}"? Se desasignará de sus proyectos.`)) return;
    await proxyFetch(`/engineer-profiles/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Ingenieros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Perfiles del equipo técnico asignables a proyectos</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-sd4a-dark text-white text-sm font-medium rounded-lg hover:bg-[#075e69] transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo ingeniero
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-sd4a-dark" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <HardHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay ingenieros registrados aún.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {profiles.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-sd4a-dark/10 flex items-center justify-center shrink-0">
                  <HardHat className="w-4 h-4 text-sd4a-dark" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  {p.email && <p className="text-xs text-muted-foreground truncate">{p.email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setEditing(p); setShowModal(true); }}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteProfile(p.id, p.name)}
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
        <ProfileModal
          existing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function ProfileModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: EngineerProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    setError(null);
    setLoading(true);
    const method = existing ? "PATCH" : "POST";
    const url = existing ? `/engineer-profiles/${existing.id}` : "/engineer-profiles";
    const r = await proxyFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim() || null }),
    });
    setLoading(false);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      setError(err.detail ?? "Error al guardar");
      return;
    }
    onSaved();
  }

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 focus:border-sd4a-mid transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">
            {existing ? "Editar ingeniero" : "Nuevo ingeniero"}
          </h2>
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
            <label className="block text-sm font-medium text-foreground mb-1">Correo (opcional)</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} placeholder="juan@sd4a.com" />
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
              {existing ? "Guardar cambios" : "Crear ingeniero"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
