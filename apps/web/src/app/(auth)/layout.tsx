export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #050d1f 0%, #0a1a3a 40%, #0d2a50 70%, #061630 100%)" }}
    >
      {/* Glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #0A7881 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #102a6e 0%, transparent 70%)" }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

      {/* Floating shapes */}
      <div className="absolute top-16 right-16 w-3 h-3 rounded-full bg-sd4a-cyan/40" />
      <div className="absolute top-32 right-40 w-1.5 h-1.5 rounded-full bg-white/20" />
      <div className="absolute bottom-24 left-20 w-2 h-2 rounded-full bg-sd4a-cyan/30" />
      <div className="absolute bottom-40 left-40 w-1 h-1 rounded-full bg-white/30" />
      <div className="absolute top-1/2 right-12 w-2 h-2 rounded-full bg-white/10" />

      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
