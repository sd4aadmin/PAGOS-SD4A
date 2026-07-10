export function SD4ALogo({
  variant = "light",
  height = 40,
  className = "",
}: {
  variant?: "light" | "dark";
  height?: number;
  className?: string;
}) {
  const w = Math.round(height * 3.6);

  const isDark = variant === "light"; // "light" = sobre fondo oscuro

  // Sobre fondo oscuro (sidebar): texto blanco, acento mint
  // Sobre fondo claro (topbar):   texto teal, acento teal oscuro
  const iconColor  = isDark ? "#9BE3BF" : "#0A7881";
  const iconShade  = isDark ? "#6ecfb0" : "#068089";
  const textMain   = isDark ? "#FFFFFF" : "#0A7881";
  const text4      = isDark ? "#9BE3BF" : "#068089";
  const subText    = isDark ? "rgba(255,255,255,0.55)" : "#68B2B7";

  const gId = `g-${variant}`;

  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 190 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SD4A Ingeniería Estructural"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={iconColor} />
          <stop offset="100%" stopColor={iconShade} />
        </linearGradient>
      </defs>

      {/* ── Ícono: pórtico estructural ──────────────────── */}
      {/* Viga horizontal superior */}
      <rect x="3"  y="9"  width="40" height="8" rx="2.5" fill={`url(#${gId})`} />
      {/* Columna izquierda */}
      <rect x="3"  y="9"  width="8"  height="32" rx="2.5" fill={`url(#${gId})`} />
      {/* Columna derecha */}
      <rect x="35" y="9"  width="8"  height="32" rx="2.5" fill={`url(#${gId})`} />
      {/* Placa base izquierda */}
      <rect x="0"  y="39" width="14" height="4.5" rx="2"  fill={iconColor} opacity="0.65" />
      {/* Placa base derecha */}
      <rect x="32" y="39" width="14" height="4.5" rx="2"  fill={iconColor} opacity="0.65" />
      {/* Línea suelo */}
      <rect x="0"  y="45" width="46" height="2"   rx="1"  fill={iconColor} opacity="0.25" />

      {/* ── Separador ──────────────────────────────────── */}
      <rect
        x="56" y="7" width="1.5" height="40" rx="1"
        fill={isDark ? "rgba(255,255,255,0.18)" : "#68B2B7"}
        opacity="0.6"
      />

      {/* ── Texto SD4A ─────────────────────────────────── */}
      <text
        x="66"
        y="36"
        fontFamily="'Arial Black', 'Arial Bold', Arial, sans-serif"
        fontWeight="900"
        fontSize="28"
        fill={textMain}
        letterSpacing="-0.5"
      >
        SD
        <tspan fill={text4}>4</tspan>
        A
      </text>

      {/* ── Subtítulo ──────────────────────────────────── */}
      <text
        x="66"
        y="47"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="500"
        fontSize="6.5"
        fill={subText}
        letterSpacing="1.9"
      >
        INGENIERÍA ESTRUCTURAL
      </text>
    </svg>
  );
}
