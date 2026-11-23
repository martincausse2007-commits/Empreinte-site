import type { MetadataRoute } from "next";

// Application installable (« Ajouter à l'écran d'accueil ») : l'espace salarié s'ouvre comme une appli.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quinzo — mon planning",
    short_name: "Quinzo",
    description: "Votre planning, vos heures, vos demandes de congé et d'échange.",
    start_url: "/moi",
    scope: "/",
    display: "standalone",
    background_color: "#fbf6f1",
    theme_color: "#b4442a",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
