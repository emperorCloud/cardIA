/**
 * Initialise le schéma PostgreSQL pour Jessy / CardIA sur Neon.
 *
 * Utilisation :
 *   1. Sur Vercel : Storage > Marketplace > Neon > Create/Connect
 *   2. Récupère les variables d'env : vercel env pull .env.local
 *   3. Lance : npm run migrate
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Création des tables...");

  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);`;

  console.log("Schéma créé avec succès.");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erreur de migration:", err);
    process.exit(1);
  });
