import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY n'est pas définie sur le serveur." },
      { status: 500 }
    );
  }

  const incomingForm = await req.formData();
  const audio = incomingForm.get("audio");

  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "Aucun fichier audio reçu." }, { status: 400 });
  }

  const groqForm = new FormData();
  groqForm.append("file", audio, "message.webm");
  groqForm.append("model", "whisper-large-v3-turbo");
  groqForm.append("language", "fr");
  groqForm.append("response_format", "json");

  const groqRes = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: groqForm,
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Erreur de transcription: ${errText}` },
      { status: 502 }
    );
  }

  const data = await groqRes.json();
  return NextResponse.json({ text: data.text ?? "" });
}
