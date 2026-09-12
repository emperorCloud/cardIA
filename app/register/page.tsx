import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Rejoignez CardIA, l'assistant IA de CARDIT, 100% Afrique.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
