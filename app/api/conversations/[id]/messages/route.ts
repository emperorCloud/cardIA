import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getConversation, listMessages } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const conversation = await getConversation(params.id, (session.user as { id: string }).id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const messages = await listMessages(params.id);
  return NextResponse.json(messages);
}
