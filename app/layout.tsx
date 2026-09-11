import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Jessy — Assistant IA CardIA | CARDIT",
  description:
    "Jessy, l'assistant IA de CardIA par CARDIT. Votre intelligence artificielle 100% Afrique.",
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
