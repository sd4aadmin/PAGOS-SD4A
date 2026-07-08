"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { User } from "@/types/user";
import { formatDate } from "@/lib/utils";
import { UserEditModal } from "./UserEditModal";
import { UserPasswordModal } from "./UserPasswordModal";
import { MoreHorizontal, Pencil, KeyRound, Ban, CheckCircle, Trash2, FolderMinus } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 10;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ENGINEER: "Ingeniero",
  CLIENT: "Cliente",
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  ADMIN:    { bg: "#f5f3ff", color: "#7c3aed" },
  ENGINEER: { bg: "#eff6ff", color: "#2563eb" },
  CLIENT:   { bg: "#f0fdfa", color: "#0A7881" },
};

type Props = { users: User[]; onRefresh: () => void };

export function UserTable({ users, onRefresh }: Props) {
  const [editUser, setEditUser]         = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [openMenu, setOpenMenu]         = useState<string | null>(null);
  const [page, setPage]                 = useState(1);

  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paged      = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function toggleActive(user: User) {
    const res = await fetch(`/api/proxy/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    if (res.ok) onRefresh();
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`¿Eliminar permanentemente a ${user.name}? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/proxy/users/${user.id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) onRefresh();
    else {
      const err = await res.json().catch(() => ({ detail: "Error al eliminar" }));
      alert(err.detail ?? "No se pudo eliminar el usuario");
    }
  }

  async function unassignUser(user: User) {
    if (!window.confirm(`¿Desasignar a ${user.name} de todos los proyectos?`)) return;
    const res = await fetch(`/api/proxy/users/${user.id}/memberships`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      alert(`${user.name} fue desasignado de todos los proyectos.`);
      onRefresh();
    } else alert("Error al desasignar");
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
            className="fixed z-[9999] bg-card border border-border rounded-xl shadow-xl w-44 py-1"
            style={{ top: menuPos.top, right: menuPos.right }}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button onClick={() => { setEditUser(user); setOpenMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-foreground">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={() => { setPasswordUser(user); setOpenMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-foreground">
              <KeyRound className="w-3.5 h-3.5" /> Cambiar clave
            </button>
            <div className="border-t my-1" />
            <button onClick={() => { toggleActive(user); setOpenMenu(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 ${user.is_active ? "text-amber-600" : "text-green-600"}`}>
              {user.is_active ? <><Ban className="w-3.5 h-3.5" /> Desactivar</> : <><CheckCircle className="w-3.5 h-3.5" /> Activar</>}
            </button>
            {user.role === "ENGINEER" && (
              <button onClick={() => { setOpenMenu(null); unassignUser(user); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-orange-50 text-orange-600">
                <FolderMinus className="w-3.5 h-3.5" /> Desasignar proyectos
              </button>
            )}
            <button onClick={() => { setOpenMenu(null); deleteUser(user); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 text-red-600">
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
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {["Nombre", "Email", "Rol", "Empresa", "Estado", "Creado", ""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-sm text-muted-foreground">
                  No hay usuarios registrados
                </td>
              </tr>
            ) : paged.map((user) => {
              const rs = ROLE_STYLE[user.role] ?? ROLE_STYLE.CLIENT;
              return (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-white"
                        style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
                      >
                        {user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span className="font-semibold text-foreground">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: rs.bg, color: rs.color }}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{user.company ?? "—"}</td>
                  <td className="px-5 py-4">
                    {user.is_active ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" /> Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-semibold">
                        <Ban className="w-3.5 h-3.5" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground text-xs">{formatDate(user.created_at)}</td>
                  <td className="px-5 py-4"><UserMenu user={user} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} totalItems={users.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {paged.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No hay usuarios registrados</p>
        )}
        {paged.map((user) => {
          const rs = ROLE_STYLE[user.role] ?? ROLE_STYLE.CLIENT;
          return (
            <div key={user.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                    style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
                  >
                    {user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: rs.bg, color: rs.color }}>
                    {ROLE_LABEL[user.role]}
                  </span>
                  <UserMenu user={user} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                {user.is_active ? (
                  <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Activo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500 text-xs font-semibold">
                    <Ban className="w-3.5 h-3.5" /> Inactivo
                  </span>
                )}
                {user.company && <span className="text-xs text-muted-foreground">· {user.company}</span>}
                <span className="text-xs text-muted-foreground ml-auto">{formatDate(user.created_at)}</span>
              </div>
            </div>
          );
        })}
        <Pagination page={page} totalPages={totalPages} totalItems={users.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {editUser && <UserEditModal user={editUser} onClose={() => setEditUser(null)} onSaved={onRefresh} />}
      {passwordUser && <UserPasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />}
    </>
  );
}
