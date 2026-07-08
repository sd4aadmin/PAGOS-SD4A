"use client";

import { proxyFetch } from "@/lib/proxy-fetch";
import { useState } from "react";
import { Eye, EyeOff, Mail, Shield, Loader2, CheckCircle2, Lock } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  ENGINEER: "Ingeniero",
  CLIENT: "Cliente",
};

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  ADMIN:    { bg: "#f5f3ff", color: "#7c3aed" },
  ENGINEER: { bg: "#eff6ff", color: "#2563eb" },
  CLIENT:   { bg: "#f0fdfa", color: "#0A7881" },
};

type SessionUser = { name: string; email: string; role: string };

export function ProfileClient({ user }: { user: SessionUser }) {
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const validationError =
    newPw.length > 0 && newPw.length < 8 ? "Mínimo 8 caracteres" :
    newPw !== confirmPw && confirmPw.length > 0 ? "Las contraseñas no coinciden" : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    const res = await proxyFetch("/users/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    if (res.ok) {
      setSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.detail ?? "Error al cambiar la contraseña");
    }
    setLoading(false);
  }

  const roleStyle = ROLE_COLOR[user.role] ?? { bg: "#f0fdfa", color: "#0A7881" };
  const initials  = user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-foreground">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Información de tu cuenta</p>
      </div>

      {/* Avatar + info card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "linear-gradient(135deg,#0A7881 0%,#068a8a 50%,#9BE3BF 100%)" }}
      >
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-20" style={{ background: "rgba(255,255,255,0.4)" }} />
        <div className="relative z-10 flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
            style={{ background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.3)" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black leading-tight">{user.name}</p>
            <p className="text-white/70 text-sm mt-0.5">{user.email}</p>
            <span
              className="inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
            >
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <span className="text-base">👤</span>, label: "Nombre",   val: user.name,  bg: "#f0fdfa",  color: "#0A7881" },
          { icon: <Mail className="w-4 h-4" />,          label: "Email",    val: user.email, bg: "#eff6ff",  color: "#2563eb" },
          { icon: <Shield className="w-4 h-4" />,        label: "Rol",      val: ROLE_LABEL[user.role] ?? user.role, bg: roleStyle.bg, color: roleStyle.color },
        ].map(({ icon, label, val, bg, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-bold text-foreground truncate">{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#f0fdfa" }}>
            <Lock className="w-4 h-4" style={{ color: "#0A7881" }} />
          </div>
          <h2 className="font-bold text-foreground">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="Contraseña actual"
            value={currentPw} onChange={setCurrentPw}
            show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)}
          />
          <PasswordField
            label="Nueva contraseña"
            value={newPw} onChange={setNewPw}
            show={showNew} onToggle={() => setShowNew(!showNew)}
            hint={newPw.length > 0 && newPw.length < 8 ? "Mínimo 8 caracteres" : undefined}
            error={newPw.length > 0 && newPw.length < 8}
          />
          <PasswordField
            label="Confirmar nueva contraseña"
            value={confirmPw} onChange={setConfirmPw}
            show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)}
            hint={confirmPw.length > 0 && newPw !== confirmPw ? "Las contraseñas no coinciden" : undefined}
            error={confirmPw.length > 0 && newPw !== confirmPw}
          />

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-600"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-emerald-700"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Contraseña actualizada correctamente
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !currentPw || !newPw || !confirmPw || !!validationError}
            className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)", boxShadow: "0 4px 14px rgba(10,120,129,0.3)" }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Cambiar contraseña
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, hint, error }: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; hint?: string; error?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3.5 py-2.5 pr-10 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 transition-colors ${
            error
              ? "border-red-300 focus:ring-red-200"
              : "border-border focus:ring-[#0A7881]/20 focus:border-[#0A7881]"
          }`}
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-red-500 mt-1">{hint}</p>}
    </div>
  );
}
