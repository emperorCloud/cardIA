# Jessy — Assistant IA CardIA (CARDIT)

Application de chat IA professionnelle, déployable gratuitement sur Vercel :
- **Groq** pour l'intelligence (Llama 3.3 70B, API gratuite)
- **Vercel Postgres** pour les comptes utilisateurs et l'historique de conversations
- **Auth.js (NextAuth v5)** pour l'authentification par e-mail / mot de passe

## 1. Clé API Groq (gratuite)

1. https://console.groq.com/keys → crée un compte → **Create API Key**
2. Copie la clé (`gsk_...`)

## 2. Base de données Vercel Postgres

1. Sur https://vercel.com, ouvre ton projet → onglet **Storage** → **Create Database** → **Postgres** (propulsé par Neon, gratuit jusqu'à 256 Mo, largement suffisant pour démarrer)
2. Une fois créée, clique sur **Connect Project** pour la lier à ce projet
3. En local, récupère les variables générées :
   ```bash
   npm i -g vercel
   vercel link
   vercel env pull .env.local
   ```
4. Ajoute ta clé Groq et un secret Auth.js dans `.env.local` :
   ```bash
   npx auth secret   # génère AUTH_SECRET et l'ajoute à .env.local
   ```
   Puis ajoute manuellement `GROQ_API_KEY=gsk_...`

5. Crée les tables (une seule fois) :
   ```bash
   npm install
   npx tsx scripts/migrate.ts
   ```

## 3. Lancer en local

```bash
npm run dev
```

Ouvre http://localhost:3000 → tu seras redirigé vers `/register` pour créer ton premier compte, puis vers le chat.

## 4. Déployer sur Vercel

1. Pousse ce projet sur GitHub
2. https://vercel.com/new → importe le dépôt
3. La base Postgres déjà liée injecte automatiquement ses variables. Ajoute en plus dans **Environment Variables** :
   - `GROQ_API_KEY`
   - `AUTH_SECRET`
4. **Deploy**
5. Une fois déployé, lance la migration contre la base de production :
   ```bash
   vercel env pull .env.local   # récupère les vraies valeurs de prod
   npx tsx scripts/migrate.ts
   ```

## Architecture

```
app/
  login/page.tsx            Écran de connexion (email + mot de passe)
  register/page.tsx         Création de compte
  page.tsx                  Interface de chat (sidebar + conversations réelles)
  api/
    auth/[...nextauth]/     Handlers Auth.js
    register/                Création de compte (hash bcrypt)
    conversations/           Liste / création de conversations
    conversations/[id]/messages/   Historique d'une conversation
    chat/route.ts            Appel Groq en streaming + sauvegarde en base
lib/
  auth.ts                    Config Auth.js (Credentials provider)
  db.ts                      Requêtes PostgreSQL (@vercel/postgres)
scripts/
  migrate.ts                 Création du schéma (users, conversations, messages)
middleware.ts                Protège toutes les pages sauf /login et /register
```

Chaque conversation et chaque message sont liés à l'utilisateur connecté et
persistés en base — rien n'est perdu au rechargement de la page ou entre deux
sessions.

## Personnaliser Jessy

- **Personnalité** : `SYSTEM_PROMPT` dans `app/api/chat/route.ts`
- **Couleurs de marque** : `tailwind.config.ts` (bleu `#085FFF`, violet `#685CF6`, cyan `#06D6A0`, fond sombre `#081020`)
- **Logo** : composant `components/LogoMark.tsx` — remplaçable par le fichier logo réel dans `public/`

## Pistes pour la suite

- Mot de passe oublié (envoi d'e-mail de réinitialisation)
- Vérification d'e-mail à l'inscription
- Suppression / renommage manuel des conversations
- Export d'une conversation en PDF
