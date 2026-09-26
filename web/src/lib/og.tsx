import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

const fonts = Promise.all([
  readFile(join(process.cwd(), "public/fonts/Inter-400.ttf")),
  readFile(join(process.cwd(), "public/fonts/Inter-800.ttf")),
]);

/** Shared Open Graph card: brand bar, big title, subtitle. */
export async function renderOgImage({ title, subtitle, accent }: { title: string; subtitle: string; accent: string }) {
  const [regular, extraBold] = await fonts;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #ffffff 0%, #fff1ef 100%)",
        fontFamily: "Inter",
        color: "#1d2130",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#e0402f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 34,
            fontWeight: 800,
          }}
        >
          P
        </div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 800 }}>
          PDF<span style={{ color: "#e0402f" }}>Düzenle</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ width: 96, height: 10, borderRadius: 5, background: accent }} />
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
        <div style={{ fontSize: 32, color: "#5b6070", lineHeight: 1.35 }}>{subtitle}</div>
      </div>
      <div style={{ fontSize: 26, color: "#5b6070" }}>pdfduzenle.tr</div>
    </div>,
    {
      ...ogSize,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}

/** Solid sRGB versions of the category colors (Satori does not support oklch). */
export const ogCategoryColors: Record<string, string> = {
  organize: "#3b7be0",
  optimize: "#2f9e62",
  convertTo: "#d98a1c",
  convertFrom: "#8e4fd1",
  edit: "#1e9bb0",
  security: "#d0333f",
};
