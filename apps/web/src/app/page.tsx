import { redirect } from "next/navigation";

export default function Home() {
  // La puerta de entrada siempre es la página corporativa;
  // al portal se llega desde su botón "Ingreso al Portal".
  redirect("https://sd4a-web.vercel.app");
}
