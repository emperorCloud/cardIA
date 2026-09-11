// lib/db.ts
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type DbUser = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export type DbConversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
};

export type DbMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

// --- Users ---

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const rows = await sql`
    SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1;
  ` as DbUser[];
  return rows[0] ?? null;
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string
): Promise<DbUser> {
  const rows = await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name}, ${email.toLowerCase()}, ${passwordHash})
    RETURNING *;
  ` as DbUser[];
  return rows[0];
}

// --- Conversations ---

export async function listConversations(userId: string): Promise<DbConversation[]> {
  const rows = await sql`
    SELECT * FROM conversations
    WHERE user_id = ${userId}
    ORDER BY created_at DESC;
  ` as DbConversation[];
  return rows;
}

export async function createConversation(
  userId: string,
  title: string
): Promise<DbConversation> {
  const rows = await sql`
    INSERT INTO conversations (user_id, title)
    VALUES (${userId}, ${title})
    RETURNING *;
  ` as DbConversation[];
  return rows[0];
}

export async function getConversation(
  id: string,
  userId: string
): Promise<DbConversation | null> {
  const rows = await sql`
    SELECT * FROM conversations WHERE id = ${id} AND user_id = ${userId} LIMIT 1;
  ` as DbConversation[];
  return rows[0] ?? null;
}

export async function renameConversationIfDefault(id: string, title: string) {
  await sql`
    UPDATE conversations
    SET title = ${title}
    WHERE id = ${id} AND title = 'Nouvelle conversation';
  `;
}

// --- Messages ---

export async function listMessages(conversationId: string): Promise<DbMessage[]> {
  const rows = await sql`
    SELECT * FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC;
  ` as DbMessage[];
  return rows;
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<DbMessage> {
  const rows = await sql`
    INSERT INTO messages (conversation_id, role, content)
    VALUES (${conversationId}, ${role}, ${content})
    RETURNING *;
  ` as DbMessage[];
  return rows[0];
}