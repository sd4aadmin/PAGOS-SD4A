"use client";

import { useState } from "react";
import { User, Role } from "@/types/user";
import { UserTable } from "./UserTable";
import { CreateUserModal } from "./CreateUserModal";
import { UserPlus } from "lucide-react";

type Props = {
  initialUsers: User[];
  role: Role;
  title: string;
  description: string;
};

export function UsersPageClient({ initialUsers, role, title, description }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/proxy/users?role=${role}&limit=100`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.items);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sd4a-blue text-white rounded-lg text-sm font-medium hover:bg-[#0d2d7a] transition"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo {role === "CLIENT" ? "cliente" : "ingeniero"}
        </button>
      </div>

      <div className="mb-3 text-sm text-muted-foreground">
        {users.length} {users.length === 1 ? "registro" : "registros"}
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
