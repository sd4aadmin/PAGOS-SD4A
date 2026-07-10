import { ImageResponse } from "next/og";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "linear-gradient(135deg, #0A7881 0%, #16938f 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Pórtico estructural */}
        <div style={{ display: "flex" }}>
          <div style={{ width: 5, height: 17, background: "#9BE3BF", borderRadius: 1.5 }} />
          <div style={{ width: 10, height: 5, background: "#9BE3BF", borderRadius: 1.5, margin: "0 -1.5px" }} />
          <div style={{ width: 5, height: 17, background: "#9BE3BF", borderRadius: 1.5 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
