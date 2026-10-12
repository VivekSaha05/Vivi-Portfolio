import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { hero, site } from "@/data/portfolio";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const [medium, regular] = await Promise.all([
  readFile(join(process.cwd(), "assets/fonts/DMMono-Medium.woff")),
  readFile(join(process.cwd(), "assets/fonts/DMMono-Regular.woff")),
]);

const C = {
  bg: "#161618",
  text: "#F4F2EF",
  muted: "#8A8790",
  violet: "#8E80B8",
  taupe: "#A8978A",
  line: "#2A2A2E",
};

/** Open Graph card: the hero, flattened. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: C.bg,
          color: C.text,
          fontFamily: "DM Mono",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 }}>
          <div style={{ display: "flex" }}>
            {site.mark.slice(0, -1)}
            <span style={{ color: C.violet }}>{site.mark.slice(-1)}</span>
          </div>
          <div style={{ display: "flex", color: C.taupe, letterSpacing: 4, fontSize: 18 }}>
            PORTFOLIO — 2026
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 22, color: C.taupe, letterSpacing: 3 }}>
            {hero.label}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 168,
              fontWeight: 500,
              letterSpacing: -9,
              lineHeight: 1,
            }}
          >
            {hero.name.join(" ")}
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 28, fontWeight: 400 }}>
            <span style={{ color: C.muted }}>{"<"}</span>
            <span style={{ color: C.violet }}>{hero.tag.component}</span>
            <span style={{ color: C.text, marginLeft: 16 }}>{hero.tag.prop}</span>
            <span style={{ color: C.muted }}>=</span>
            <span style={{ color: C.taupe }}>{`"${hero.tag.value}"`}</span>
            <span style={{ color: C.muted, marginLeft: 16 }}>{"/>"}</span>
          </div>
        </div>

        <div style={{ display: "flex", height: 2, width: "100%", background: C.violet }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "DM Mono", data: medium, style: "normal", weight: 500 },
        { name: "DM Mono", data: regular, style: "normal", weight: 400 },
      ],
    },
  );
}
