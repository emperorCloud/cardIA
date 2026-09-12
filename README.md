# Jessy — Assistant IA CardIA (CARDIT)

Application de chat IA professionnelle sur Vercel :
- **Groq** pour le texte (Llama 3.3 70B) et la voix (Whisper, gratuit)
- **Neon** (Postgres) pour comptes utilisateurs et historique de conversations
- **Auth.js (NextAuth v5)** — connexion par e-mail / mot de passe
- **SEO / branding** — favicons, image de partage, manifest PWA, métadonnées complètes

Testé sur **Next.js 16** (Turbopack, `proxy.ts`, params async).

## 1. Clé API Groq (gratuite)

https://console.groq.com/keys → crée un compte → **Create API Key** (`gsk_...`)

## 2. Base de données Neon

Vercel a retiré son offre "Vercel Postgres" au profit d'une intégration native
avec **Neon** — c'est ce que ce projet utilise.

1. Sur ton projet Vercel → **Storage** → **Marketplace** → **Neon** → Create/Connect
2. En local :
   ```bash
   npm i -g vercel
   vercel link
   vercel env pull .env.local
   ```
   Cela remplit `DATABASE_URL` automatiquement.
3. Crée les tables (une seule fois, ou à chaque nouvel environnement) :
   ```bash
   npm install
   npm run migrate
   ```

## 3. Secret Auth.js

```bash
npx auth secret
```

⚠️ Cette commande ajoute une variable **`AUTH_SECRET`** dans `.env.local`.
Si tu as utilisé un générateur en ligne qui t'a donné plusieurs lignes
(`BETTER_AUTH_SECRET=`, `AUTH_SECRET=`, `JWT_SECRET=`...), c'est qu'il
génère pour plusieurs librairies différentes en même temps — **Better Auth**
est un concurrent d'Auth.js/NextAuth, pas ce qu'on utilise ici. Ne garde que
la ligne `AUTH_SECRET=...` (ou renomme la variable `BETTER_AUTH_SECRET` en
`AUTH_SECRET` si tu veux réutiliser la même valeur).

## 4. Lancer en local

```bash
npm run dev
```

http://localhost:3000 → redirection vers `/register` pour créer ton premier
compte, puis vers le chat.

## 5. Déployer sur Vercel

1. Pousse le projet sur GitHub, importe-le sur https://vercel.com/new
2. Connecte la base Neon (étape 2) — `DATABASE_URL` est injectée automatiquement
3. Ajoute dans **Environment Variables** :
   - `GROQ_API_KEY`
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_SITE_URL` (ex: `https://cardia.cardit.cm`) — utilisée pour les balises SEO/Open Graph
4. **Deploy**
5. Lance la migration contre la base de production si ce n'est pas déjà fait :
   ```bash
   vercel env pull .env.local
   npm run migrate
   ```

## Ce qui a été ajouté pour le branding / SEO

- `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` — générés aux couleurs
  CardIA (dégradé bleu `#085FFF` → violet `#685CF6`, marque "IA")
- `app/opengraph-image.png` / `twitter-image.png` — aperçu de partage sur
  WhatsApp, LinkedIn, Twitter/X, avec le nom CardIA et la signature CARDIT
- `app/manifest.ts` — rend l'app installable (PWA) sur mobile, avec icône et
  couleurs de marque
- Métadonnées complètes dans `app/layout.tsx` : title/description/keywords,
  Open Graph, Twitter Card, `robots`, URL canonique
- Titres dédiés sur `/login` et `/register` (ces pages publiques sont la
  vitrine indexable de l'app)

Pour remplacer ces visuels par le vrai logo CardIA (celui de ta maquette),
dépose tes fichiers finaux directement dans `app/icon.png`,
`app/apple-icon.png`, `app/opengraph-image.png` — Next.js les sert
automatiquement, aucune autre config à toucher.

## Message vocal

Le bouton 🎤 dans la barre de saisie enregistre la voix (MediaRecorder),
l'envoie à `/api/transcribe`, qui appelle **Whisper Large v3 Turbo** chez Groq
(même fournisseur que Jessy, gratuit). Le texte transcrit se place dans le
champ de saisie — l'utilisateur peut le relire avant d'envoyer.

## Architecture

```
app/
  login/            page.tsx (metadata) + LoginForm.tsx (client)
  register/         page.tsx (metadata) + RegisterForm.tsx (client)
  page.tsx           Interface de chat (sidebar, conversations, vocal)
  manifest.ts         Manifest PWA
  icon.png / apple-icon.png / favicon.ico / opengraph-image.png
  api/
    auth/[...nextauth]/   Handlers Auth.js
    register/              Création de compte (hash bcrypt)
    conversations/          Liste / création de conversations
    conversations/[id]/messages/   Historique (params async, Next 16)
    chat/route.ts           Appel Groq texte en streaming + sauvegarde
    transcribe/route.ts     Appel Groq Whisper pour la voix
lib/
  auth.ts             Config Auth.js
  db.ts               Requêtes Neon (@neondatabase/serverless)
scripts/
  migrate.ts           Création du schéma
  gen_branding.py       Génère les visuels de marque (favicons, OG image)
proxy.ts              Protège toutes les pages sauf /login et /register
                       (remplace middleware.ts, convention Next 16)
```

## Pistes pour la suite

- Mot de passe oublié (envoi d'e-mail de réinitialisation)
- Vérification d'e-mail à l'inscription
- Suppression / renommage manuel des conversations
- Lecture audio des réponses de Jessy (TTS) — Groq n'en propose pas encore,
  il faudrait un service tiers (ElevenLabs, etc.)
