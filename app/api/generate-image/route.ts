import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt manquant." }, { status: 400 });
  }

  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?width=1024&height=1024&nologo=true&seed=${seed}`;

  // On vérifie que l'image se génère correctement avant de renvoyer l'URL,
  // pour éviter d'afficher une image cassée côté client.
  const check = await fetch(url);
  if (!check.ok) {
    return NextResponse.json({ error: "Génération d'image indisponible." }, { status: 502 });
  }

  return NextResponse.json({ url });
}
