import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PDF Düzenle",
    short_name: "PDF Düzenle",
    description: "Ücretsiz ve güvenli online PDF araçları",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e0402f",
    lang: "tr",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
