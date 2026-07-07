"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Users, CreditCard,
  HardHat, Activity, UserCircle, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  group?: string;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  href: "/dashboard",         icon: LayoutDashboard, roles: ["ADMIN", "ENGINEER"], exact: true },
  { label: "Proyectos",  href: "/dashboard/projects", icon: FolderKanban,    roles: ["ADMIN", "ENGINEER", "CLIENT"] },
  { label: "Mi Perfil",  href: "/dashboard/profile",  icon: UserCircle,      roles: ["ADMIN", "ENGINEER", "CLIENT"] },
  { label: "Clientes",   href: "/admin/clients",      icon: Users,           roles: ["ADMIN"],                         group: "admin" },
  { label: "Ingenieros", href: "/admin/engineers",    icon: HardHat,         roles: ["ADMIN", "ENGINEER"],             group: "admin" },
  { label: "Pagos",      href: "/admin/payments",     icon: CreditCard,      roles: ["ADMIN"],                         group: "admin" },
  { label: "Actividad",  href: "/admin/activity",     icon: Activity,        roles: ["ADMIN", "ENGINEER"],             group: "admin" },
];

export function SidebarNav({ role }: { role: string }) {
  const sectionLabel = role === "ENGINEER" ? "Herramientas" : "Administración";
  const pathname = usePathname();
  const items      = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const mainItems  = items.filter((i) => !i.group);
  const adminItems = items.filter((i) => i.group === "admin");

  // Acordeón: abierto por defecto si algún item admin está activo
  const adminActive = adminItems.some((i) =>
    i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/")
  );
  const [adminOpen, setAdminOpen] = useState(adminActive);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 bg-sidebar-bg flex-col shrink-0">
        {/* Logo */}
        <div className="h-20 flex items-center justify-center px-4 border-b border-white/10">
          <Image src="/logo-dark.png" alt="SD4A" width={180} height={64} className="object-contain" priority />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {mainItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}

          {adminItems.length > 0 && (
            <div className="pt-3">
              {/* Acordeón header */}
              <button
                onClick={() => setAdminOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-hover hover:text-white transition-colors group"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sd4a-mid group-hover:text-white/70 transition-colors">
                  {sectionLabel}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-sd4a-mid group-hover:text-white/70 transition-all duration-200",
                    adminOpen ? "rotate-180" : "rotate-0"
                  )}
                />
              </button>

              {/* Acordeón body */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  adminOpen ? "max-h-96 opacity-100 mt-0.5" : "max-h-0 opacity-0"
                )}
              >
                <div className="space-y-0.5 pl-2 border-l border-white/10 ml-3">
                  {adminItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-sidebar-muted text-xs text-center">v1.0.0</p>
        </div>
      </aside>

      {/* ── Mobile bottom bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar-bg border-t border-white/10 flex items-center justify-around px-1 py-1 safe-bottom">
        {[...mainItems, ...adminItems].slice(0, 5).map((item) => (
          <MobileNavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-active text-white"
          : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function MobileNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-0 flex-1",
        active ? "text-white" : "text-sidebar-foreground"
      )}
    >
      <Icon className={cn("w-5 h-5", active && "text-sd4a-cyan")} />
      <span className="text-[9px] font-medium leading-tight truncate">{item.label}</span>
    </Link>
  );
}
