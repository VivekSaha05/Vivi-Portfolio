import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/data/portfolio";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const dmMono = await readFile(join(process.cwd(), "assets/fonts/DMMono-Medium.woff"));

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#161618",
          fontFamily: "DM Mono",
          fontSize: 104,
          letterSpacing: -8,
          color: "#F4F2EF",
        }}
      >
        {site.mark.slice(0, -1)}
        <span style={{ color: "#8E80B8" }}>{site.mark.slice(-1)}</span>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "DM Mono", data: dmMono, style: "normal", weight: 500 }],
    },
  );
}
