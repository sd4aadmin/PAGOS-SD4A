import { ImageResponse } from "next/og";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "linear-gradient(135deg, #0A7881 0%, #16938f 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex" }}>
          <div style={{ width: 22, height: 80, background: "#9BE3BF", borderRadius: 6 }} />
          <div style={{ width: 56, height: 22, background: "#9BE3BF", borderRadius: 6, margin: "0 -6px" }} />
          <div style={{ width: 22, height: 80, background: "#9BE3BF", borderRadius: 6 }} />
        </div>
        <div style={{ width: 120, height: 7, background: "rgba(155,227,191,0.4)", borderRadius: 6, marginTop: 10 }} />
        <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", marginTop: 8, fontFamily: "Arial" }}>SD4A</div>
      </div>
    ),
    { ...size }
  );
}
