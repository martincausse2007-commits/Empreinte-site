import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { ConfirmProvider, ToastProvider } from "@/components/ui";
import { NavTracker } from "@/components/NavTracker";

// Police Inter hébergée dans le projet (aucun appel à Google Fonts).
const inter = localFont({
  src: "./fonts/InterVariable-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});
// Police des titres (caractère, sans être décorative), elle aussi hébergée dans le projet.
const display = localFont({
  src: "./fonts/BricolageGrotesque-latin.woff2",
  weight: "200 800",
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quinzo — Le planning d'équipe en 15 minutes",
  description: "Planning d'équipe pour restaurants et boutiques : génération automatique, alertes, partage WhatsApp.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf6f1", // = couleur --color-page du thème (les métadonnées n'acceptent pas de variable CSS)
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <AppProvider>
          <ToastProvider>
            <ConfirmProvider>
              <NavTracker />
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
