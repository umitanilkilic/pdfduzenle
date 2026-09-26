import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#e0402f" }}>
      <svg viewBox="0 0 32 32" width="180" height="180">
        <path d="M10 7h8.5L23 11.5V24a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" fill="#fff" />
        <path d="M18.5 7v4.5H23" fill="none" stroke="#e0402f" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="m12.5 20.5 5.2-5.2 1.8 1.8-5.2 5.2H12.5v-1.8Z" fill="#e0402f" />
      </svg>
    </div>,
    size,
  );
}
