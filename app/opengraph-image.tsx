import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE } from "@/lib/content";

export const alt = "GJS — Agence de développement web";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PALETTE_BARS = ["#1b4079", "#4d7c8a", "#7f9c96", "#8fad88", "#cbdf90"];

export default async function OpengraphImage() {
  const clashSemibold = await readFile(join(process.cwd(), "assets/ClashDisplay-Semibold.otf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#04070e",
          backgroundImage: "radial-gradient(90% 80% at 50% 0%, #0d1b33 0%, #04070e 65%)",
          padding: "64px 72px",
          fontFamily: "Clash",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {PALETTE_BARS.map((c) => (
              <div key={c} style={{ width: 46, height: 10, borderRadius: 6, backgroundColor: c }} />
            ))}
          </div>
          <div style={{ color: "#7f9c96", fontSize: 24, letterSpacing: 6 }}>AGENCE WEB — FR</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{ color: "#eaf3ee", fontSize: 260, lineHeight: 0.9, letterSpacing: -8 }}>GJS</div>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                backgroundColor: "#cbdf90",
                marginBottom: 34,
                marginLeft: 8,
              }}
            />
          </div>
          <div style={{ color: "#cbdf90", fontSize: 44, marginTop: 18 }}>
            Créer. Automatiser. Accélérer.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#7f9c96",
            fontSize: 26,
          }}
        >
          <div>Sites · Automatisation · Données · Conseil</div>
          <div>{SITE.url.replace("https://", "")}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Clash", data: clashSemibold, weight: 600, style: "normal" }],
    }
  );
}
