import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ActivityPageClient } from "@/components/activity/ActivityPageClient";

export const metadata = { title: "Actividad — SD4A Portal" };

export default async function ActivityPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["ADMIN", "ENGINEER"].includes(session.user.role)) redirect("/dashboard");

  return <ActivityPageClient />;
}
