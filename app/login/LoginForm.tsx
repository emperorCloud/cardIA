"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { LogoMark } from "@/components/LogoMark";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("E-mail ou mot de passe incorrect.");
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
          <p className="mt-1 text-sm text-white/50">Bienvenue sur CardIA</p>
          <p className="text-xs text-white/30">Connectez-vous pour accéder à votre assistant IA.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-cardia-dark2 px-3 py-2.5 text-sm text-white outline-none focus:border-cardia-violet/60"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-cardia-blue py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2 text-xs text-white/40">
          <button className="hover:text-white/70">Mot de passe oublié ?</button>
          <p>
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-cardia-violet hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
