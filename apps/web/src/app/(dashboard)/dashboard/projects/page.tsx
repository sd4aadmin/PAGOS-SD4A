import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProjectsPageClient } from "@/components/projects/ProjectsPageClient";

export const metadata = { title: "Proyectos — SD4A Portal" };

export default async function ProjectsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <ProjectsPageClient role={session.user.role} />;
}
