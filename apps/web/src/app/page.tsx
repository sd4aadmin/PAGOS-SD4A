import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  // Con sesión activa → al portal; sin sesión → a la página corporativa
  if (session) redirect("/dashboard");
  redirect("https://sd4a-web.vercel.app");
}
