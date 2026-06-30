import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";

export const metadata = { title: "Detalle de proyecto — SD4A Portal" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  return <ProjectDetailClient projectId={id} role={session.user.role} />;
}
