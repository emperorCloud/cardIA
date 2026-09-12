import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CardIA — Assistant IA par CARDIT",
    short_name: "CardIA",
    description: "Jessy, votre assistant IA 100% Afrique, conçu par CARDIT.",
    start_url: "/",
    display: "standalone",
    background_color: "#081020",
    theme_color: "#081020",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
