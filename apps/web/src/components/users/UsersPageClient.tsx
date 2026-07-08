"use client";

import { useState } from "react";
import { User, Role } from "@/types/user";
import { UserTable } from "./UserTable";
import { CreateUserModal } from "./CreateUserModal";
import { UserPlus, Users, RefreshCw } from "lucide-react";

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

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    val: users.length, color: "#0A7881", bg: "#f0fdfa" },
          { label: "Activos",  val: active,       color: "#10b981", bg: "#ecfdf5" },
          { label: "Inactivos",val: inactive,     color: "#f59e0b", bg: "#fffbeb" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Users className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-black text-foreground">{val}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <UserTable users={users} onRefresh={refresh} />

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
