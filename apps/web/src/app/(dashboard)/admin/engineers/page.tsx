import { serverFetch } from "@/lib/api-server";
import { UserList } from "@/types/user";
import { UsersPageClient } from "@/components/users/UsersPageClient";

export default async function EngineersPage() {
  const data = await serverFetch<UserList>("/users?role=ENGINEER&limit=100");

  return (
    <UsersPageClient
      initialUsers={data.items}
      role="ENGINEER"
      title="Ingenieros"
      description="Equipo técnico con acceso a proyectos y archivos"
    />
  );
}
