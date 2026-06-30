import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-sd4a-dark flex items-center justify-center">
        <span className="text-white text-2xl font-bold">S</span>
      </div>
      <h1 className="text-8xl font-black text-sd4a-dark">404</h1>
      <p className="text-muted-foreground">Página no encontrada</p>
      <Link href="/dashboard" className="px-4 py-2 bg-sd4a-dark text-white rounded-lg text-sm font-semibold hover:bg-[#075e69] transition-colors">
        Ir al dashboard
      </Link>
    </div>
  );
}
