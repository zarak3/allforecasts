import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-font";

export const size = { width: 128, height: 128 };
export const contentType = "image/png";

export default async function Icon() {
  const fraunces = await loadGoogleFont("Fraunces", 600, "AF");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e3a5f",
          borderRadius: "50%",
        }}
      >
        <div
          style={{
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: 64,
            letterSpacing: "-2px",
            color: "#faf6ee",
            display: "flex",
            transform: "translateY(-2px)",
          }}
        >
          AF
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Fraunces", data: fraunces, weight: 600, style: "normal" }] }
  );
}
