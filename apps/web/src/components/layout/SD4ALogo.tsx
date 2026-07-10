export function SD4ALogo({
  variant = "light",
  height = 40,
  className = "",
}: {
  variant?: "light" | "dark";
  height?: number;
  className?: string;
}) {
  const w = Math.round(height * 3.46);

  // Paleta según fondo
  const iconFill   = variant === "dark" ? "#0A7881" : "#9BE3BF";
  const iconShade  = variant === "dark" ? "#068089" : "#6ecfb0";
  const textMain   = variant === "dark" ? "#0A7881" : "#FFFFFF";
  const text4      = variant === "dark" ? "#068089" : "#9BE3BF";
  const subText    = variant === "dark" ? "#68B2B7" : "rgba(255,255,255,0.50)";
  const divider    = variant === "dark" ? "#68B2B7" : "rgba(255,255,255,0.18)";

  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 180 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SD4A Ingeniería Estructural"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`ico-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={iconFill} />
          <stop offset="100%" stopColor={iconShade} />
        </linearGradient>
      </defs>

      {/* ── Icono: pórtico estructural ── */}
      {/* Viga superior */}
      <rect x="2" y="10" width="38" height="7" rx="2" fill={`url(#ico-${variant})`} />
      {/* Columna izquierda */}
      <rect x="2" y="10" width="7" height="30" rx="2" fill={`url(#ico-${variant})`} />
      {/* Columna derecha */}
      <rect x="33" y="10" width="7" height="30" rx="2" fill={`url(#ico-${variant})`} />
      {/* Placa base izquierda */}
      <rect x="0" y="38" width="11" height="4" rx="1.5" fill={iconFill} opacity="0.7" />
      {/* Placa base derecha */}
      <rect x="31" y="38" width="11" height="4" rx="1.5" fill={iconFill} opacity="0.7" />
      {/* Línea de suelo */}
      <rect x="0" y="43" width="42" height="2" rx="1" fill={iconFill} opacity="0.3" />

      {/* ── Separador vertical ── */}
      <rect x="52" y="8" width="1.5" height="36" rx="1" fill={divider} />

      {/* ── Texto principal SD4A ── */}
      <text
        x="62"
        y="33"
        fontFamily="'Arial Black', 'Arial Bold', Arial, sans-serif"
        fontWeight="900"
        fontSize="26"
        fill={textMain}
        letterSpacing="-0.5"
      >
        SD
        <tspan fill={text4}>4</tspan>
        A
      </text>

      {/* ── Subtítulo ── */}
      <text
        x="62"
        y="45"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="500"
        fontSize="6.8"
        fill={subText}
        letterSpacing="1.8"
      >
        INGENIERÍA ESTRUCTURAL
      </text>
    </svg>
  );
}
