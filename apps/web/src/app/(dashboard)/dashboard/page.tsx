import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { EngineerDashboard } from "@/components/dashboard/EngineerDashboard";

export const metadata = { title: "Dashboard — SD4A Portal" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { name, role } = session.user;

  if (role === "CLIENT") redirect("/dashboard/projects");
  if (role === "ADMIN") return <AdminDashboard userName={name} />;
  return <EngineerDashboard userName={name} />;
}
