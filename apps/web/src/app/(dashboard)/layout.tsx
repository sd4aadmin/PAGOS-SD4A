import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { TopBar } from "@/components/layout/TopBar";
import { MaintenanceBanner } from "@/components/layout/MaintenanceBanner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav role={session.user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar user={session.user} />
        <MaintenanceBanner isAdmin={session.user.role === "ADMIN"} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
