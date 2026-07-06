"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { logout } from "@/app/actions/auth";
import { LogOut, Sun, Moon, User } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { MaintenanceToggle } from "@/components/layout/MaintenanceBanner";

type TopBarUser = { name: string; email: string; role: string };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  ENGINEER: "Ingeniero",
  CLIENT: "Cliente",
};

const STORAGE_KEY = "sd4a-maintenance";
const EVENT_KEY = "sd4a-maintenance-change";

export function TopBar({ user }: { user: TopBarUser }) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    setMaintenance(localStorage.getItem(STORAGE_KEY) === "true");
    function onEvent() { setMaintenance(localStorage.getItem(STORAGE_KEY) === "true"); }
    window.addEventListener(EVENT_KEY, onEvent);
    return () => window.removeEventListener(EVENT_KEY, onEvent);
  }, []);

  function toggleMaintenance() {
    const next = !maintenance;
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(EVENT_KEY));
    setMaintenance(next);
  }

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-3 md:px-5 shrink-0">
      {/* Logo solo en móvil */}
      <div className="md:hidden flex items-center">
        <Image src="/logo-light.png" alt="SD4A" width={115} height={36} className="object-contain dark:hidden" priority />
        <Image src="/logo-dark.png" alt="SD4A" width={115} height={36} className="object-contain hidden dark:block" priority />
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        {user.role === "ADMIN" && (
          <MaintenanceToggle enabled={maintenance} onToggle={toggleMaintenance} />
        )}

        <NotificationBell />

        <button
          onClick={toggle}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => router.push("/dashboard/profile")}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-sd4a-dark flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-foreground leading-tight">{user.name}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
        </button>

        <form action={logout}>
          <button
            type="submit"
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
