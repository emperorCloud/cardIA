import { sql } from "@vercel/postgres";

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

export async function getUserByEmail(email: string) {
  const { rows } = await sql<DbUser>`
    SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1;
  `;
  return rows[0] ?? null;
}

export async function createUser(name: string, email: string, passwordHash: string) {
  const { rows } = await sql<DbUser>`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name}, ${email.toLowerCase()}, ${passwordHash})
    RETURNING *;
  `;
  return rows[0];
}

// --- Conversations ---

export async function listConversations(userId: string) {
  const { rows } = await sql<DbConversation>`
    SELECT * FROM conversations
    WHERE user_id = ${userId}
    ORDER BY created_at DESC;
  `;
  return rows;
}

export async function createConversation(userId: string, title: string) {
  const { rows } = await sql<DbConversation>`
    INSERT INTO conversations (user_id, title)
    VALUES (${userId}, ${title})
    RETURNING *;
  `;
  return rows[0];
}

export async function getConversation(id: string, userId: string) {
  const { rows } = await sql<DbConversation>`
    SELECT * FROM conversations WHERE id = ${id} AND user_id = ${userId} LIMIT 1;
  `;
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

export async function listMessages(conversationId: string) {
  const { rows } = await sql<DbMessage>`
    SELECT * FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC;
  `;
  return rows;
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
) {
  const { rows } = await sql<DbMessage>`
    INSERT INTO messages (conversation_id, role, content)
    VALUES (${conversationId}, ${role}, ${content})
    RETURNING *;
  `;
  return rows[0];
}
