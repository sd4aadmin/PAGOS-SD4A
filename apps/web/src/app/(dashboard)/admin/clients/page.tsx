import { serverFetch } from "@/lib/api-server";
import { UserList } from "@/types/user";
import { UsersPageClient } from "@/components/users/UsersPageClient";

export default async function ClientsPage() {
  const data = await serverFetch<UserList>("/users?role=CLIENT&limit=100");

  return (
    <UsersPageClient
      initialUsers={data.items}
      role="CLIENT"
      title="Clientes"
      description="Gestión de clientes registrados en la plataforma"
    />
  );
}
