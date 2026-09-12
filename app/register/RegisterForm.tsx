"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { LogoMark } from "@/components/LogoMark";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cardia-dark px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-cardia-panel/60 p-8 shadow-glow">
        <div className="flex flex-col items-center">
          <LogoMark size={44} />
          <h1 className="mt-3 text-xl font-semibold text-white">
            Card<span className="text-cardia-violet">IA</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">Créer votre compte</p>
          <p className="text-xs text-white/30">Rejoignez CardIA, votre assistant IA 100% Afrique.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Nom complet</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-cardia-dark2 px-3 py-2.5 text-sm text-white outline-none focus:border-cardia-violet/60"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Adresse e-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-cardia-dark2 px-3 py-2.5 text-sm text-white outline-none focus:border-cardia-violet/60"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-cardia-dark2 px-3 py-2.5 text-sm text-white outline-none focus:border-cardia-violet/60"
              placeholder="8 caractères minimum"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-cardia-blue py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-white/40">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-cardia-violet hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
