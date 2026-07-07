import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Renote AI",
    short_name: "Renote",
    description: "あなたの言葉を、そのまま、もっと伝わる文章へ。",
    start_url: "/app",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#0ea5e9",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
