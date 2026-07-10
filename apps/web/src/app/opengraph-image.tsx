import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SD4A Portal — Ingeniería Estructural";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #063f45 0%, #0A7881 55%, #16938f 100%)",
          fontFamily: "Arial, sans-serif",
          position: "relative",
        }}
      >
        {/* Círculos decorativos */}
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 400,
            height: 400,
            borderRadius: 999,
            background: "rgba(155,227,191,0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -80,
            bottom: -140,
            width: 340,
            height: 340,
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* Ícono pórtico */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          <div style={{ display: "flex" }}>
            <div style={{ width: 26, height: 100, background: "#9BE3BF", borderRadius: 8 }} />
            <div style={{ width: 88, height: 26, background: "#9BE3BF", borderRadius: 8, margin: "0 -8px" }} />
            <div style={{ width: 26, height: 100, background: "#9BE3BF", borderRadius: 8 }} />
          </div>
          <div style={{ width: 170, height: 8, background: "rgba(155,227,191,0.4)", borderRadius: 8, marginTop: 12 }} />
        </div>

        <div style={{ display: "flex", fontSize: 110, fontWeight: 900, color: "#FFFFFF", letterSpacing: -2 }}>
          SD<span style={{ color: "#9BE3BF" }}>4</span>A
        </div>
        <div
          style={{
            fontSize: 34,
            color: "rgba(255,255,255,0.75)",
            letterSpacing: 12,
            marginTop: 8,
          }}
        >
          INGENIERÍA ESTRUCTURAL
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 24,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Portal de seguimiento de proyectos y pagos
        </div>
      </div>
    ),
    { ...size }
  );
}
