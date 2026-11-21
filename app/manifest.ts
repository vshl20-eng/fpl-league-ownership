import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FPL League Ownership",
    short_name: "FPL Ownership",
    description: "FPL mini-league player ownership analyser",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f4",
    theme_color: "#007e50",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
