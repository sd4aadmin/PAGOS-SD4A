import { coverB64 } from "./cover-b64";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo: portada (solo desktop) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden flex-col"
        style={{
          backgroundImage: `url('${coverB64}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, rgba(10,120,129,0.25) 0%, rgba(4,24,32,0.72) 100%)" }}
        />
        <div className="relative z-10 flex flex-col justify-between h-full p-14">
          <span
            className="self-start inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ background: "rgba(155,227,191,0.18)", color: "#9BE3BF", border: "1px solid rgba(155,227,191,0.35)" }}
          >
            Portal de Proyectos
          </span>
          <div>
            <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.1] mb-5 drop-shadow-lg">
              Ingeniería<br />
              <span style={{ color: "#9BE3BF" }}>Estructural</span><br />
              de confianza.
            </h1>
            <p className="text-white/65 text-lg leading-relaxed max-w-md">
              Gestiona tus proyectos, pagos y documentos desde un solo lugar,
              con total transparencia y en tiempo real.
            </p>
          </div>
          <p className="text-white/25 text-sm">© {new Date().getFullYear()} SD4A — Todos los derechos reservados</p>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden min-h-screen">

        {/* MÓVIL: imagen de fondo incrustada */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            backgroundImage: `url('${coverB64}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 lg:hidden" style={{ background: "rgba(5,35,45,0.62)" }} />

        {/* DESKTOP: fondo gris muy suave */}
        <div className="absolute inset-0 hidden lg:block" style={{ background: "#eef4f5" }} />

        <div className="relative z-10 w-full max-w-sm">
          {/* Volver a la página principal — mint sobre fondo oscuro (móvil), teal sobre claro (desktop) */}
          <a
            href="https://sd4a-web.vercel.app"
            className="lg:hidden inline-flex items-center gap-1.5 mb-4 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: "#9BE3BF" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
            </svg>
            Volver a la página principal
          </a>
          <a
            href="https://sd4a-web.vercel.app"
            className="hidden lg:inline-flex items-center gap-1.5 mb-4 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: "#0A7881" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
            </svg>
            Volver a la página principal
          </a>
          {children}
        </div>
      </div>

    </div>
  );
}
