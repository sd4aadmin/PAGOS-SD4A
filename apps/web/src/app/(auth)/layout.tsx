export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo: portada (solo desktop) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cover.png" alt="SD4A" className="absolute inset-0 w-full h-full object-cover" />
        {/* Overlay más transparente para que la imagen se vea bien */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(10,120,129,0.35) 0%, rgba(4,30,40,0.75) 100%)" }} />
        <div className="relative z-10 flex flex-col justify-between h-full p-14">
          <span
            className="self-start inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ background: "rgba(155,227,191,0.20)", color: "#9BE3BF", border: "1px solid rgba(155,227,191,0.35)" }}
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

        {/* MÓVIL: imagen de fondo visible */}
        <div className="absolute inset-0 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cover.png" alt="" className="w-full h-full object-cover" />
          {/* Overlay claro/suave para que la imagen se vea pero el texto sea legible */}
          <div className="absolute inset-0" style={{ background: "rgba(10,120,129,0.55)" }} />
        </div>

        {/* DESKTOP: fondo blanco limpio */}
        <div className="absolute inset-0 hidden lg:block" style={{ background: "#f8fafb" }} />

        <div className="relative z-10 w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  );
}
