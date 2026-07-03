"use client";

import { useState } from "react";
import { User } from "@/types/user";
import { formatDate } from "@/lib/utils";
import { UserEditModal } from "./UserEditModal";
import { UserPasswordModal } from "./UserPasswordModal";
import { MoreHorizontal, Pencil, KeyRound, Ban, CheckCircle } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 10;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  ENGINEER: "Ingeniero",
  CLIENT: "Cliente",
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  ENGINEER: "bg-blue-100 text-blue-700",
  CLIENT: "bg-muted text-foreground",
};

type Props = {
  users: User[];
  onRefresh: () => void;
};

export function UserTable({ users, onRefresh }: Props) {
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paged = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function toggleActive(user: User) {
    const res = await fetch(`/api/proxy/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    if (res.ok) onRefresh();
  }

  return (
    <>
      <div className="bg-card rounded-xl border overflow-visible">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b bg-muted/50 rounded-t-xl">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Creado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paged.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[user.role]}`}>
                    {ROLE_LABEL[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.company ?? "—"}</td>
                <td className="px-4 py-3">
                  {user.is_active ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                      <Ban className="w-3.5 h-3.5" /> Inactivo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                      className="p-1.5 rounded-lg hover:bg-muted transition"
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {openMenu === user.id && (
                      <div
                        className="absolute right-0 top-8 z-50 bg-card border border-border rounded-xl shadow-lg w-44 py-1"
                        onMouseLeave={() => setOpenMenu(null)}
                      >
                        <button
                          onClick={() => { setEditUser(user); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => { setPasswordUser(user); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-foreground"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Cambiar clave
                        </button>
                        <div className="border-t my-1" />
                        <button
                          onClick={() => { toggleActive(user); setOpenMenu(null); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 ${user.is_active ? "text-red-600" : "text-green-600"}`}
                        >
                          {user.is_active ? <><Ban className="w-3.5 h-3.5" /> Desactivar</> : <><CheckCircle className="w-3.5 h-3.5" /> Activar</>}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalItems={users.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {editUser && (
        <UserEditModal user={editUser} onClose={() => setEditUser(null)} onSaved={onRefresh} />
      )}
      {passwordUser && (
        <UserPasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />
      )}
    </>
  );
}
