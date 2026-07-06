"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { User } from "@/types/user";
import { formatDate } from "@/lib/utils";
import { UserEditModal } from "./UserEditModal";
import { UserPasswordModal } from "./UserPasswordModal";
import { MoreHorizontal, Pencil, KeyRound, Ban, CheckCircle, Trash2 } from "lucide-react";
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

  async function deleteUser(user: User) {
    if (!window.confirm(`¿Eliminar permanentemente a ${user.full_name}? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/proxy/users/${user.id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) onRefresh();
    else {
      const err = await res.json().catch(() => ({ detail: "Error al eliminar" }));
      alert(err.detail ?? "No se pudo eliminar el usuario");
    }
  }

  function UserMenu({ user }: { user: User }) {
    const btnRef = useRef<HTMLButtonElement>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

    useEffect(() => {
      if (openMenu === user.id && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
      }
    }, [openMenu]);

    useEffect(() => {
      function onScroll() { if (openMenu === user.id) setOpenMenu(null); }
      window.addEventListener("scroll", onScroll, true);
      return () => window.removeEventListener("scroll", onScroll, true);
    }, [openMenu]);

    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
          className="p-1.5 rounded-lg hover:bg-muted transition"
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
        {openMenu === user.id && menuPos && createPortal(
          <div
            className="fixed z-[9999] bg-card border border-border rounded-xl shadow-lg w-44 py-1"
            style={{ top: menuPos.top, right: menuPos.right }}
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
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 ${user.is_active ? "text-amber-600" : "text-green-600"}`}
            >
              {user.is_active ? <><Ban className="w-3.5 h-3.5" /> Desactivar</> : <><CheckCircle className="w-3.5 h-3.5" /> Activar</>}
            </button>
            <button
              onClick={() => { setOpenMenu(null); deleteUser(user); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-card rounded-xl border overflow-visible">
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
                    <UserMenu user={user} />
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

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-2">
        {paged.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No hay usuarios registrados</p>
        )}
        {paged.map((user) => (
          <div key={user.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[user.role]}`}>
                  {ROLE_LABEL[user.role]}
                </span>
                <UserMenu user={user} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
              {user.is_active ? (
                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Activo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                  <Ban className="w-3.5 h-3.5" /> Inactivo
                </span>
              )}
              {user.company && (
                <span className="text-xs text-muted-foreground">· {user.company}</span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{formatDate(user.created_at)}</span>
            </div>
          </div>
        ))}
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
