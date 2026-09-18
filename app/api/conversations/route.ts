//app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createConversation, listConversations } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const conversations = await listConversations((session.user as { id: string }).id);
  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = body.title || "Nouvelle conversation";

  const conversation = await createConversation(
    (session.user as { id: string }).id,
    title
  );
  return NextResponse.json(conversation);
}
