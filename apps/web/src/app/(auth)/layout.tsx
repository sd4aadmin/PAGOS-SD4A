export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo: portada (solo desktop) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden flex-col"
        style={{
          backgroundImage: "url('/cover.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#0A7881", /* fallback mientras carga */
        }}
      >
        {/* Overlay gradiente */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, rgba(10,120,129,0.30) 0%, rgba(4,24,32,0.78) 100%)" }}
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

          <p className="text-white/25 text-sm">
            © {new Date().getFullYear()} SD4A — Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden min-h-screen"
      >
        {/* MÓVIL: imagen de fondo */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            backgroundImage: "url('/cover.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#0A7881",
          }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{ background: "rgba(5,40,50,0.60)" }}
        />

        {/* DESKTOP: fondo blanco */}
        <div className="absolute inset-0 hidden lg:block" style={{ background: "#f8fafb" }} />

        <div className="relative z-10 w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  );
}
