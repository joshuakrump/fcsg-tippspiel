import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FCSG Tippspiel",
    short_name: "FCSG Tippspiel",
    description:
      "Tippe die Spiele des FC St. Gallen, verfolge den Live-Ticker und kämpfe um den ersten Platz in der Rangliste.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#052e16",
    theme_color: "#15803d",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
