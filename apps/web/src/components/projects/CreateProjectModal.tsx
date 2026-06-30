"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().optional(),
  client_id: z.string().min(1, "Selecciona un cliente"),
  total_value: z.coerce.number().positive("Debe ser mayor a 0"),
  advance_percent: z.coerce.number().int().min(1).max(100),
  start_date: z.string().optional(),
  estimated_date: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ClientOption {
  id: string;
  name: string;
  email: string;
}

export function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { advance_percent: 40 },
  });

  useEffect(() => {
    fetch("/api/proxy/users?role=CLIENT&is_active=true")
      .then((r) => r.json())
      .then((data) => setClients(data.items ?? data))
      .catch(() => {});
  }, []);

  async function onSubmit(data: FormData) {
    setError(null);
    const payload = {
      ...data,
      start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
      estimated_date: data.estimated_date ? new Date(data.estimated_date).toISOString() : null,
    };
    const res = await fetch("/api/proxy/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail ?? "Error al crear proyecto");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-foreground">Nuevo proyecto</h2>
            <p className="text-xs text-muted-foreground mt-0.5">El código se genera automáticamente</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Nombre del proyecto" error={errors.name?.message}>
            <input {...register("name")} className={inputCls} placeholder="Modelado BIM Torre Norte" />
          </Field>

          <Field label="Descripción" error={errors.description?.message}>
            <textarea {...register("description")} rows={2} className={inputCls} placeholder="Descripción opcional del proyecto..." />
          </Field>

          <Field label="Cliente" error={errors.client_id?.message}>
            <select {...register("client_id")} className={inputCls}>
              <option value="">Seleccionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor total (COP)" error={errors.total_value?.message}>
              <input {...register("total_value")} type="number" className={inputCls} placeholder="15000000" />
            </Field>
            <Field label="% Anticipo requerido" error={errors.advance_percent?.message}>
              <input {...register("advance_percent")} type="number" min={1} max={100} className={inputCls} placeholder="40" />
            </Field>
            <Field label="Fecha inicio" error={errors.start_date?.message}>
              <input {...register("start_date")} type="date" className={inputCls} />
            </Field>
            <Field label="Fecha estimada entrega" error={errors.estimated_date?.message}>
              <input {...register("estimated_date")} type="date" className={inputCls} />
            </Field>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted/50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-lg bg-sd4a-blue text-white text-sm font-medium hover:bg-[#0d2d7a] flex items-center justify-center gap-2 disabled:opacity-70">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crear proyecto
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
