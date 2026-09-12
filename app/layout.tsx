import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cardia.cardit-cm.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CardIA — Jessy, votre assistant IA 100% Afrique | CARDIT",
    template: "%s | CardIA",
  },
  description:
    "CardIA est l'assistant IA développé par CARDIT à Douala, Cameroun. Jessy vous aide dans vos projets, votre travail et votre quotidien avec une intelligence artificielle locale, sécurisée et connectée aux réalités africaines.",
  keywords: [
    "CardIA",
    "Jessy",
    "CARDIT",
    "intelligence artificielle Afrique",
    "IA Cameroun",
    "assistant IA Douala",
    "chatbot africain",
  ],
  authors: [{ name: "CARDIT" }],
  creator: "CARDIT",
  publisher: "CARDIT",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "CardIA",
    title: "CardIA — Jessy, votre assistant IA 100% Afrique",
    description:
      "L'assistant IA de CARDIT : chat intelligent, aide à la productivité et connaissances africaines, dans une plateforme sécurisée.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "CardIA par CARDIT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CardIA — Jessy, votre assistant IA 100% Afrique",
    description: "L'assistant IA de CARDIT, conçu pour l'Afrique.",
    images: ["/twitter-image.png"],
  },
  themeColor: "#081020",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
