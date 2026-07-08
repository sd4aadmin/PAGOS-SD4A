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

      {/* Encabezado */}
      <div className="mb-8">
        <h2
          className="text-3xl font-black mb-1 lg:text-[#0A7881]"
          style={{ color: "var(--login-heading, #0A7881)" }}
        >
          Bienvenido
        </h2>
        <p
          className="text-sm lg:text-slate-500"
          style={{ color: "var(--login-sub, rgba(255,255,255,0.55))" }}
        >
          Ingresa tus credenciales para acceder al portal
        </p>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          :root {
            --login-heading: #0A7881;
            --login-sub: #64748b;
            --login-label: #475569;
            --login-input-bg: #ffffff;
            --login-input-border: #cbd5e1;
            --login-input-border-focus: #0A7881;
            --login-input-text: #0f172a;
            --login-input-placeholder: #94a3b8;
            --login-icon: #94a3b8;
          }
        }
        @media (max-width: 1023px) {
          :root {
            --login-heading: #ffffff;
            --login-sub: rgba(255,255,255,0.55);
            --login-label: rgba(255,255,255,0.6);
            --login-input-bg: rgba(255,255,255,0.08);
            --login-input-border: rgba(255,255,255,0.12);
            --login-input-border-focus: rgba(104,178,183,0.7);
            --login-input-text: #ffffff;
            --login-input-placeholder: rgba(255,255,255,0.25);
            --login-icon: rgba(255,255,255,0.35);
          }
        }
      `}</style>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Email */}
        <div>
          <label
            className="block text-xs font-semibold mb-2 uppercase tracking-widest"
            style={{ color: "var(--login-label)" }}
          >
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--login-icon)" }} />
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="correo@empresa.com"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A7881]/40 transition"
              style={{
                background: "var(--login-input-bg)",
                border: "1px solid var(--login-input-border)",
                color: "var(--login-input-text)",
              }}
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
          <label
            className="block text-xs font-semibold mb-2 uppercase tracking-widest"
            style={{ color: "var(--login-label)" }}
          >
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--login-icon)" }} />
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A7881]/40 transition"
              style={{
                background: "var(--login-input-bg)",
                border: "1px solid var(--login-input-border)",
                color: "var(--login-input-text)",
              }}
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
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm text-red-600"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-bold py-3.5 rounded-xl text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
          style={{
            background: "linear-gradient(135deg, #0A7881 0%, #68B2B7 100%)",
            boxShadow: "0 4px 20px rgba(10,120,129,0.35)",
          }}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? "Ingresando..." : "Ingresar al portal"}
        </button>

      </form>

      <p className="text-center text-xs mt-8 lg:text-slate-400" style={{ color: "var(--login-sub)" }}>
        © {new Date().getFullYear()} SD4A — Ingeniería Estructural
      </p>

    </div>
  );
}
