import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TSUMUGU",
    short_name: "TSUMUGU",
    description:
      "TSUMUGUは、ユーザー自身の言葉を大切にしながら、自然で伝わりやすい文章へ整えるAIライティングアシスタントです。",
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
