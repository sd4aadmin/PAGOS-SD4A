import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile/ProfileClient";

export const metadata = { title: "Mi Perfil — SD4A Portal" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <ProfileClient user={session.user} />;
}
