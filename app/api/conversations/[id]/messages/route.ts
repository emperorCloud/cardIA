//app/api/conversations/[id]/messages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getConversation, listMessages } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const conversation = await getConversation(id, userId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const messages = await listMessages(id);
  return NextResponse.json(messages);
}