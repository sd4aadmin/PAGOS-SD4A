export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo: portada (desktop) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cover.png"
          alt="SD4A"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(10,120,129,0.50) 0%, rgba(5,13,31,0.65) 100%)" }}
        />
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <div>
            <span
              className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
              style={{ background: "rgba(155,227,191,0.18)", color: "#9BE3BF", border: "1px solid rgba(155,227,191,0.3)" }}
            >
              Portal de Proyectos
            </span>
          </div>
          <div>
            <h1 className="text-5xl xl:text-6xl font-black text-white leading-tight mb-6">
              Ingeniería<br />
              <span style={{ color: "#9BE3BF" }}>Estructural</span><br />
              de confianza.
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              Gestiona tus proyectos, pagos y documentos desde un solo lugar,
              con total transparencia y en tiempo real.
            </p>
          </div>
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} SD4A — Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">

        {/* Fondo móvil: imagen de portada con overlay */}
        <div className="absolute inset-0 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cover.png" alt="" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "rgba(5,13,31,0.72)" }}
          />
        </div>

        {/* Fondo desktop: color sólido claro */}
        <div
          className="absolute inset-0 hidden lg:block"
          style={{ background: "#f0f9fa" }}
        />

        <div className="relative z-10 w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  );
}
