//app/login/page.tsx
import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à CardIA pour discuter avec Jessy, l'assistant IA de CARDIT.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <LoginForm />;
}
