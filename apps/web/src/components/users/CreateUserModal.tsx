"use client";

import { proxyFetch } from "@/lib/proxy-fetch";

import { useState, useEffect } from "react";
import { X, Loader2, ChevronDown } from "lucide-react";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function CreateUserModal({
  onClose,
  onCreated,
  defaultRole = "CLIENT",
}: {
  onClose: () => void;
  onCreated: () => void;
  defaultRole?: "ADMIN" | "ENGINEER" | "CLIENT";
}) {
  const isEngineer = defaultRole === "ENGINEER";

  // Engineer-simple state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [existingEmails, setExistingEmails] = useState<string[]>([]);
  const [useExisting, setUseExisting] = useState(false);

  // Full-form state (CLIENT / ADMIN)
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState(defaultRole);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEngineer) return;
    proxyFetch("/users?role=ENGINEER&is_active=true")
      .then(r => r.json())
      .then((d: {email: string}[]) => {
        const emails = [...new Set((Array.isArray(d) ? d : d.items ?? []).map((u: {email: string}) => u.email))];
        setExistingEmails(emails);
      })
      .catch(() => {});
  }, [isEngineer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    if (!email.trim()) { setError("El correo es requerido"); return; }

    const auto_password = isEngineer ? generatePassword() : password;
    if (!isEngineer && auto_password.length < 8) { setError("La contraseña debe tener mínimo 8 caracteres"); return; }

    setLoading(true);
    const res = await proxyFetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password: auto_password,
        role: isEngineer ? "ENGINEER" : role,
        phone: phone || undefined,
        company: company || undefined,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail ?? "Error al crear usuario");
      return;
    }
    onCreated();
    onClose();
  }

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 focus:border-sd4a-mid transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">
            {isEngineer ? "Nuevo ingeniero" : "Crear usuario"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nombre completo</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputCls}
              placeholder="Juan Pérez"
              autoFocus
            />
          </div>

          {/* Email — ingeniero: selector o texto libre */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-foreground">Correo electrónico</label>
              {isEngineer && existingEmails.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setUseExisting(v => !v); setEmail(""); }}
                  className="text-xs text-sd4a-dark hover:underline flex items-center gap-0.5"
                >
                  {useExisting ? "Escribir nuevo" : "Usar correo existente"}
                  <ChevronDown className="w-3 h-3" />
                </button>
              )}
            </div>

            {isEngineer && useExisting ? (
              <select
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
              >
                <option value="">Seleccionar correo...</option>
                {existingEmails.map(em => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
            ) : (
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                className={inputCls}
                placeholder="correo@empresa.com"
              />
            )}

            {isEngineer && (
              <p className="text-xs text-muted-foreground mt-1">
                La contraseña se generará automáticamente y se enviará al correo.
              </p>
            )}
          </div>

          {/* Campos extra solo para no-ingenieros */}
          {!isEngineer && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Contraseña</label>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type="password"
                  className={inputCls}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rol</label>
                <select value={role} onChange={e => setRole(e.target.value as typeof role)} className={inputCls}>
                  <option value="CLIENT">Cliente</option>
                  <option value="ENGINEER">Ingeniero</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+57 300..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Empresa</label>
                  <input value={company} onChange={e => setCompany(e.target.value)} className={inputCls} placeholder="Empresa S.A.S" />
                </div>
              </div>
            </>
          )}

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
              {isEngineer ? "Crear ingeniero" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
