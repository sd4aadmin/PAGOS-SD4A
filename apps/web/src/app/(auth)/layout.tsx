export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo: portada ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden flex-col">
        {/* Imagen de fondo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cover.png"
          alt="SD4A"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay gradiente para legibilidad */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, rgba(10,120,129,0.55) 0%, rgba(5,13,31,0.70) 100%)",
          }}
        />

        {/* Contenido sobre la imagen */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Badge superior */}
          <div>
            <span
              className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
              style={{ background: "rgba(155,227,191,0.18)", color: "#9BE3BF", border: "1px solid rgba(155,227,191,0.3)" }}
            >
              Portal de Proyectos
            </span>
          </div>

          {/* Texto central */}
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

          {/* Footer */}
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} SD4A — Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #050d1f 0%, #0a1a3a 60%, #061630 100%)" }}
      >
        {/* Glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #0A7881 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #102a6e 0%, transparent 70%)" }}
        />

        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  );
}
