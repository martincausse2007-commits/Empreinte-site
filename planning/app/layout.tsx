import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Quinzo — Le planning d'équipe en 15 minutes",
  description: "Planning d'équipe pour restaurants et boutiques : génération automatique, alertes, partage WhatsApp.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f7f8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <AppProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
