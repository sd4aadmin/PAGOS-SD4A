/**
 * Logo SD4A en SVG — nítido a cualquier tamaño, sin dependencia de imágenes.
 * variant="light" → texto blanco / mint (para sidebar oscuro y topbar móvil oscuro)
 * variant="dark"  → texto teal oscuro (para topbar en modo claro)
 * variant="auto"  → cambia automáticamente con prefers-color-scheme (CSS)
 */
export function SD4ALogo({
  variant = "light",
  height = 40,
  className = "",
}: {
  variant?: "light" | "dark" | "auto";
  height?: number;
  className?: string;
}) {
  const aspectRatio = 3.2;
  const width = Math.round(height * aspectRatio);

  const textColor  = variant === "dark" ? "#0A7881" : "#FFFFFF";
  const accentColor = variant === "dark" ? "#0A7881" : "#9BE3BF";
  const subColor   = variant === "dark" ? "#68B2B7" : "rgba(255,255,255,0.55)";

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 160 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SD4A"
    >
      {/* ── Icono geométrico ── */}
      <g>
        {/* Hexágono exterior */}
        <polygon
          points="18,4 30,4 36,14 30,24 18,24 12,14"
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Rombo interior */}
        <polygon
          points="24,8 30,14 24,20 18,14"
          fill={accentColor}
          opacity="0.85"
        />
        {/* Punto central */}
        <circle cx="24" cy="14" r="3" fill={variant === "dark" ? "#0A7881" : "#fff"} opacity="0.9" />
        {/* Línea decorativa inferior */}
        <line x1="12" y1="28" x2="36" y2="28" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* ── Texto SD4A ── */}
      <text
        x="44"
        y="20"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900"
        fontSize="18"
        fill={textColor}
        letterSpacing="0.5"
      >
        SD
        <tspan fill={accentColor}>4</tspan>
        A
      </text>

      {/* ── Subtítulo ── */}
      <text
        x="44"
        y="31"
        fontFamily="Arial, sans-serif"
        fontWeight="400"
        fontSize="7"
        fill={subColor}
        letterSpacing="1.2"
      >
        INGENIERÍA ESTRUCTURAL
      </text>
    </svg>
  );
}
