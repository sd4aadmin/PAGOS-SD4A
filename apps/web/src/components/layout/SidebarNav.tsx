"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CreditCard,
  Settings,
  HardHat,
  Activity,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  group?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "ENGINEER"] },
  { label: "Proyectos", href: "/dashboard/projects", icon: FolderKanban, roles: ["ADMIN", "ENGINEER", "CLIENT"] },
  { label: "Mi Perfil", href: "/dashboard/profile", icon: UserCircle, roles: ["ADMIN", "ENGINEER", "CLIENT"] },
  { label: "Clientes", href: "/admin/clients", icon: Users, roles: ["ADMIN"], group: "admin" },
  { label: "Ingenieros", href: "/admin/engineers", icon: HardHat, roles: ["ADMIN"], group: "admin" },
  { label: "Pagos", href: "/admin/payments", icon: CreditCard, roles: ["ADMIN"], group: "admin" },
  { label: "Actividad", href: "/admin/activity", icon: Activity, roles: ["ADMIN", "ENGINEER"], group: "admin" },
  { label: "Configuración", href: "/admin/settings", icon: Settings, roles: ["ADMIN"], group: "admin" },
];

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const mainItems = items.filter((i) => !i.group);
  const adminItems = items.filter((i) => i.group === "admin");

  return (
    <aside className="w-56 bg-sidebar-bg flex flex-col shrink-0 min-w-[14rem]">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-sd4a-mid rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-tight leading-none block">SD4A</span>
            <span className="text-blue-300 text-[10px] leading-none">Portal BIM</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}

        {adminItems.length > 0 && (
          <>
            <div className="pt-4 pb-1.5 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sd4a-mid">Administración</span>
            </div>
            {adminItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-sidebar-muted text-xs text-center">v1.0.0</p>
      </div>
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
