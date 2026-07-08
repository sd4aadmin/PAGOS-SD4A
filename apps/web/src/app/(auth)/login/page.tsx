"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});
type FormData = z.infer<typeof schema>;

/* Estilos compartidos para inputs */
const inputBase: React.CSSProperties = {
  width: "100%",
  paddingLeft: "2.75rem",
  paddingRight: "1rem",
  paddingTop: "0.875rem",
  paddingBottom: "0.875rem",
  borderRadius: "0.75rem",
  fontSize: "0.875rem",
  outline: "none",
  transition: "border-color 0.15s",
  background: "#f1f5f9",
  border: "1.5px solid #94a3b8",
  color: "#0f172a",
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    if (result?.error) { setError("Credenciales incorrectas. Verifica tu email y contraseña."); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    /* Tarjeta: transparente en móvil, transparente en desktop también */
    <div
      className="w-full rounded-2xl p-8 lg:p-10"
      style={{
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 8px 40px rgba(10,120,129,0.10)",
        border: "1px solid rgba(10,120,129,0.08)",
      }}
    >
      {/* Encabezado centrado */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-black mb-1" style={{ color: "#0A7881" }}>Bienvenido</h2>
        <p className="text-sm text-slate-500">Ingresa tus credenciales para acceder al portal</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Email */}
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-slate-600">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="correo@empresa.com"
              style={inputBase}
              onFocus={e => (e.currentTarget.style.borderColor = "#0A7881")}
              onBlur={e => (e.currentTarget.style.borderColor = "#94a3b8")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold mb-2 uppercase tracking-widest text-slate-600">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              style={inputBase}
              onFocus={e => (e.currentTarget.style.borderColor = "#0A7881")}
              onBlur={e => (e.currentTarget.style.borderColor = "#94a3b8")}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.password.message}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm text-red-600"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-bold py-3.5 rounded-xl text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
          style={{ background: "linear-gradient(135deg, #0A7881 0%, #68B2B7 100%)", boxShadow: "0 4px 20px rgba(10,120,129,0.35)" }}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? "Ingresando..." : "Ingresar al portal"}
        </button>
      </form>

      <p className="text-center text-xs mt-6 text-slate-400">
        © {new Date().getFullYear()} SD4A — Ingeniería Estructural
      </p>
    </div>
  );
}
