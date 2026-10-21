"use client";

import { useState } from "react";
import { User, Role } from "@/types/user";
import { UserTable } from "./UserTable";
import { CreateUserModal } from "./CreateUserModal";
import { UserPlus, RefreshCw } from "lucide-react";
import { SummaryFilter } from "@/components/ui/SummaryFilter";

type Props = {
  initialUsers: User[];
  role: Role;
  title: string;
  description: string;
};

export function UsersPageClient({ initialUsers, role, title, description }: Props) {
  const [users, setUsers]     = useState(initialUsers);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  async function refresh() {
    setLoading(true);
    const res = await fetch(`/api/proxy/users?role=${role}&limit=100`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.items);
    }
    setLoading(false);
  }

  const active   = users.filter(u => u.is_active).length;
  const inactive = users.length - active;
  const visibleUsers = statusFilter === "ALL" ? users : users.filter((u) => (statusFilter === "ACTIVE" ? u.is_active : !u.is_active));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)", boxShadow: "0 4px 14px rgba(10,120,129,0.35)" }}
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo {role === "CLIENT" ? "cliente" : "ingeniero"}</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Resumen compacto: los contadores filtran la tabla */}
      <section aria-label="Resumen de cuentas" className="bg-card border border-border rounded-xl card-elevated overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border">
          <SummaryFilter
            label="Total" value={String(users.length)} detail={users.length === 1 ? "cuenta" : "cuentas"}
            tone="text-foreground" active={statusFilter === "ALL"}
            onClick={() => setStatusFilter("ALL")}
          />
          <SummaryFilter
            label="Activos" value={String(active)} detail="pueden ingresar"
            tone="text-emerald-700 dark:text-emerald-400" active={statusFilter === "ACTIVE"}
            onClick={() => setStatusFilter(statusFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
          />
          <SummaryFilter
            label="Inactivos" value={String(inactive)} detail={inactive === 0 ? "ninguno" : "sin acceso"}
            tone={inactive > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"} active={statusFilter === "INACTIVE"}
            onClick={() => setStatusFilter(statusFilter === "INACTIVE" ? "ALL" : "INACTIVE")}
          />
        </div>
      </section>

      <UserTable key={statusFilter} users={visibleUsers} onRefresh={refresh} />

      {creating && (
        <CreateUserModal
          defaultRole={role}
          onClose={() => setCreating(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}
