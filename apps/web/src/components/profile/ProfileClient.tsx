"use client";
import { useState } from "react";
import { Eye, EyeOff, User, Mail, Shield, Loader2, CheckCircle2 } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  ENGINEER: "Ingeniero",
  CLIENT: "Cliente",
};

type SessionUser = { name: string; email: string; role: string };

export function ProfileClient({ user }: { user: SessionUser }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError =
    newPw.length > 0 && newPw.length < 8 ? "Mínimo 8 caracteres" :
    newPw !== confirmPw && confirmPw.length > 0 ? "Las contraseñas no coinciden" : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/proxy/users/me/password", {
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

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Información de tu cuenta</p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 card-shadow flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sd4a-dark/10 flex items-center justify-center">
            <User className="w-4 h-4 text-sd4a-dark" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nombre</p>
            <p className="text-sm font-semibold text-foreground">{user.name}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-shadow flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sd4a-dark/10 flex items-center justify-center">
            <Mail className="w-4 h-4 text-sd4a-dark" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-shadow flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sd4a-dark/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-sd4a-dark" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rol</p>
            <p className="text-sm font-semibold text-foreground">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-card border border-border rounded-xl p-5 card-shadow">
        <h2 className="font-semibold text-foreground mb-4">Cambiar contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField label="Contraseña actual" value={currentPw} onChange={setCurrentPw} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
          <PasswordField label="Nueva contraseña" value={newPw} onChange={setNewPw} show={showNew} onToggle={() => setShowNew(!showNew)}
            hint={newPw.length > 0 && newPw.length < 8 ? "Mínimo 8 caracteres" : undefined} error={newPw.length > 0 && newPw.length < 8} />
          <PasswordField label="Confirmar nueva contraseña" value={confirmPw} onChange={setConfirmPw} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)}
            hint={confirmPw.length > 0 && newPw !== confirmPw ? "Las contraseñas no coinciden" : undefined} error={confirmPw.length > 0 && newPw !== confirmPw} />

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> Contraseña actualizada correctamente
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !currentPw || !newPw || !confirmPw || !!validationError}
            className="flex items-center gap-2 px-4 py-2 bg-sd4a-dark text-white rounded-lg text-sm font-semibold hover:bg-[#075e69] disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 transition-colors ${
            error ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-sd4a-mid/50 focus:border-sd4a-mid"
          }`}
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-destructive mt-1">{hint}</p>}
    </div>
  );
}
