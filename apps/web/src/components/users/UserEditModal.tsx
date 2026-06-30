"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { User } from "@/types/user";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  phone: z.string().optional(),
  company: z.string().optional(),
  role: z.enum(["ADMIN", "ENGINEER", "CLIENT"]),
});

type FormData = z.infer<typeof schema>;

export function UserEditModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name,
      phone: user.phone ?? "",
      company: user.company ?? "",
      role: user.role,
    },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await fetch(`/api/proxy/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail ?? "Error al guardar");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Editar usuario</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Nombre" error={errors.name?.message}>
            <input {...register("name")} className={inputCls} />
          </Field>
          <Field label="Teléfono" error={errors.phone?.message}>
            <input {...register("phone")} className={inputCls} />
          </Field>
          <Field label="Empresa" error={errors.company?.message}>
            <input {...register("company")} className={inputCls} />
          </Field>
          <Field label="Rol" error={errors.role?.message}>
            <select {...register("role")} className={inputCls}>
              <option value="CLIENT">Cliente</option>
              <option value="ENGINEER">Ingeniero</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </Field>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted/50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-lg bg-sd4a-blue text-white text-sm font-medium hover:bg-[#0d2d7a] flex items-center justify-center gap-2 disabled:opacity-70">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 bg-background text-foreground";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
