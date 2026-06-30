"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, CheckCircle } from "lucide-react";
import { User } from "@/types/user";

const schema = z.object({
  new_password: z.string().min(8, "Mínimo 8 caracteres"),
  confirm: z.string(),
}).refine((d) => d.new_password === d.confirm, {
  message: "Las contraseñas no coinciden",
  path: ["confirm"],
});

type FormData = z.infer<typeof schema>;

export function UserPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await fetch(`/api/proxy/users/${user.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: data.new_password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail ?? "Error al cambiar contraseña");
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Cambiar contraseña</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{user.name} — {user.email}</p>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="text-sm text-foreground font-medium">Contraseña actualizada</p>
            <button onClick={onClose} className="mt-2 px-4 py-2 bg-sd4a-blue text-white rounded-lg text-sm">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nueva contraseña</label>
              <input type="password" {...register("new_password")} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 bg-background text-foreground" />
              {errors.new_password && <p className="text-xs text-red-500 mt-1">{errors.new_password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Confirmar contraseña</label>
              <input type="password" {...register("confirm")} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 bg-background text-foreground" />
              {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted/50">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-lg bg-sd4a-blue text-white text-sm font-medium hover:bg-[#0d2d7a] flex items-center justify-center gap-2 disabled:opacity-70">
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
