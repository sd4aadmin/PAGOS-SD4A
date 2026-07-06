"use client";

import { proxyFetch } from "@/lib/proxy-fetch";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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

function formatCOP(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CO");
}
function parseCOP(display: string): string {
  return display.replace(/\./g, "").replace(/\s/g, "");
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
  const [rawValue, setRawValue] = useState("");

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { advance_percent: 40 },
  });

  useEffect(() => {
    proxyFetch("/users?role=CLIENT&is_active=true")
      .then((r) => r.json())
      .then((data) => setClients(data.items ?? data))
      .catch(() => {});
  }, []);

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseCOP(e.target.value);
    setRawValue(raw);
    setValue("total_value", Number(raw) || 0, { shouldValidate: true });
  }

  async function onSubmit(data: FormData) {
    setError(null);
    const payload = {
      ...data,
      start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
      estimated_date: data.estimated_date ? new Date(data.estimated_date).toISOString() : null,
    };
    const res = await proxyFetch("/projects", {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header fijo */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-semibold text-foreground">Nuevo proyecto</h2>
            <p className="text-xs text-muted-foreground mt-0.5">El código se genera automáticamente</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <Field label="Nombre del proyecto" error={errors.name?.message}>
            <input {...register("name")} className={inputCls} placeholder="Diseño estructural Torre Norte" />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Valor total (COP)" error={errors.total_value?.message}>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCOP(rawValue)}
                  onChange={handleValueChange}
                  className={inputCls}
                  placeholder="15.000.000"
                />
                {rawValue && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">COP</span>
                )}
              </div>
            </Field>
            <Field label="% Anticipo requerido" error={errors.advance_percent?.message}>
              <input {...register("advance_percent")} type="number" min={1} max={100} className={inputCls} placeholder="40" />
            </Field>
            <Field label="Fecha inicio" error={errors.start_date?.message}>
              <input {...register("start_date")} type="date" className={inputCls} />
            </Field>
            <Field label="Fecha estimada de entrega" error={errors.estimated_date?.message}>
              <input {...register("estimated_date")} type="date" className={inputCls} />
            </Field>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Botones fijos abajo */}
          <div className="flex gap-2 pt-2 pb-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-lg bg-sd4a-blue text-white text-sm font-medium hover:bg-[#0d2d7a] flex items-center justify-center gap-2 disabled:opacity-70">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crear proyecto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-border bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
