import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-font";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
        }}
      >
        <div
          style={{
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: 90,
            letterSpacing: "-3px",
            color: "#faf6ee",
            display: "flex",
            transform: "translateY(-3px)",
          }}
        >
          AF
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Fraunces", data: fraunces, weight: 600, style: "normal" }] }
  );
}
