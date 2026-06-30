import { ImageResponse } from "next/og";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32, height: 32, borderRadius: 6,
        background: "linear-gradient(135deg, #0A7881 0%, #68B2B7 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontSize: 18, fontWeight: 800,
      }}
    >
      S
    </div>,
    { ...size }
  );
}
