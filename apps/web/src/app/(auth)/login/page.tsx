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

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full">

      {/* Logo + saludo */}
      <div className="mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.png" alt="SD4A" height={48} style={{ height: 48, width: "auto", objectFit: "contain", marginBottom: 24 }} />
        <h2 className="text-3xl font-black text-white mb-1">Bienvenido</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          Ingresa tus credenciales para acceder al portal
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="correo@empresa.com"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
              onFocus={e => (e.currentTarget.style.border = "1px solid rgba(104,178,183,0.6)")}
              onBlur={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
              onFocus={e => (e.currentTarget.style.border = "1px solid rgba(104,178,183,0.6)")}
              onBlur={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)")}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.password.message}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm text-red-300"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
          style={{
            background: "linear-gradient(135deg, #0A7881 0%, #68B2B7 100%)",
            color: "#fff",
            boxShadow: "0 4px 24px rgba(10,120,129,0.45), 0 1px 0 rgba(255,255,255,0.1) inset",
            letterSpacing: "0.02em",
          }}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? "Ingresando..." : "Ingresar al portal"}
        </button>

      </form>

      <p className="text-center text-xs mt-8" style={{ color: "rgba(255,255,255,0.2)" }}>
        © {new Date().getFullYear()} SD4A — Ingeniería Estructural
      </p>
    </div>
  );
}
