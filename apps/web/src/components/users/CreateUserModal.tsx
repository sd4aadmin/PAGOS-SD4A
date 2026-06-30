"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, CheckCircle2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  role: z.enum(["ADMIN", "ENGINEER", "CLIENT"]),
  phone: z.string().optional(),
  company: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateUserModal({
  onClose,
  onCreated,
  defaultRole = "CLIENT",
}: {
  onClose: () => void;
  onCreated: () => void;
  defaultRole?: "ADMIN" | "ENGINEER" | "CLIENT";
}) {
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting, touchedFields } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
    mode: "onTouched",
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await fetch("/api/proxy/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail ?? "Error al crear usuario");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">Crear usuario</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre completo" error={errors.name?.message} valid={touchedFields.name && !errors.name} colSpan>
              <input {...register("name")} className={inputCls(!!errors.name, touchedFields.name && !errors.name)} placeholder="Juan Pérez" />
            </Field>
            <Field label="Email" error={errors.email?.message} valid={touchedFields.email && !errors.email} colSpan>
              <input {...register("email")} type="email" className={inputCls(!!errors.email, touchedFields.email && !errors.email)} placeholder="correo@empresa.com" />
            </Field>
            <Field label="Contraseña" error={errors.password?.message} valid={touchedFields.password && !errors.password}>
              <input {...register("password")} type="password" className={inputCls(!!errors.password, touchedFields.password && !errors.password)} placeholder="••••••••" />
            </Field>
            <Field label="Rol" error={errors.role?.message} valid={touchedFields.role && !errors.role}>
              <select {...register("role")} className={inputCls(!!errors.role, touchedFields.role && !errors.role)}>
                <option value="CLIENT">Cliente</option>
                <option value="ENGINEER">Ingeniero</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </Field>
            <Field label="Teléfono" error={errors.phone?.message} valid={touchedFields.phone && !errors.phone}>
              <input {...register("phone")} className={inputCls(!!errors.phone, false)} placeholder="+57 300 000 0000" />
            </Field>
            <Field label="Empresa" error={errors.company?.message} valid={touchedFields.company && !errors.company}>
              <input {...register("company")} className={inputCls(!!errors.company, false)} placeholder="Empresa S.A.S" />
            </Field>
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
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-lg bg-sd4a-dark text-white text-sm font-medium hover:bg-[#075e69] flex items-center justify-center gap-2 disabled:opacity-70 transition-colors">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean, isValid: boolean | undefined) {
  const base = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 border bg-background text-foreground transition-colors";
  if (hasError) return `${base} border-red-400 focus:ring-red-300 focus:border-red-400`;
  if (isValid) return `${base} border-green-400 focus:ring-green-300 focus:border-green-400`;
  return `${base} border-border focus:ring-sd4a-mid/50 focus:border-sd4a-mid`;
}

function Field({ label, error, valid, children, colSpan }: {
  label: string; error?: string; valid?: boolean; children: React.ReactNode; colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-foreground">{label}</label>
        {valid && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
      </div>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
