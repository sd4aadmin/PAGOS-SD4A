"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

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
      {/* Logo / Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-sd4a-cyan rounded-2xl mb-4 shadow-lg">
          <span className="text-white font-bold text-2xl">S</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">SD4A</h1>
        <p className="text-blue-200 mt-1 text-sm">Portal de Proyectos BIM</p>
      </div>

      {/* Card */}
      <div className="bg-card rounded-2xl shadow-2xl p-8">
        <h2 className="text-xl font-semibold text-foreground mb-1">Iniciar sesión</h2>
        <p className="text-sm text-muted-foreground mb-6">Accede a tu portal de proyectos</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Correo electrónico
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="correo@empresa.com"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-cyan focus:border-transparent transition"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Contraseña
            </label>
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-cyan focus:border-transparent transition"
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-sd4a-blue hover:bg-[#0d2d7a] text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>

      <p className="text-center text-blue-200 text-xs mt-6">
        © {new Date().getFullYear()} SD4A — Ingeniería y BIM
      </p>
    </div>
  );
}
