// Couche d'accès aux modèles : Gemini (Google AI Studio, gratuit), Groq (gratuit) et Claude (payant).
// Les fournisseurs sont tentés dans l'ordre de LLM_PROVIDER_ORDER ; le premier qui répond est utilisé.
// Une clé absente = fournisseur ignoré.

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type LLMRequest = {
  system: string;
  messages: ChatMessage[];
  imageDataUrl?: string | null;
  webSearch: boolean;
};

export type OpenedStream = {
  provider: "anthropic" | "gemini" | "groq";
  model: string;
  tokens: () => AsyncGenerator<string>;
};

export type OpenResult =
  | { ok: true; stream: OpenedStream }
  | { ok: false; friendlyMessage: string; attempts: string[] };

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ---------- Utilitaires ----------

// Anthropic exige des rôles alternés, en commençant par "user".
function normalize(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (!m.content?.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n\n${m.content}`;
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

function parseDataUrl(dataUrl: string) {
  const m = /^data:(.+?);base64,([\s\S]*)$/.exec(dataUrl);
  if (m) return { mediaType: m[1], data: m[2] };
  return { mediaType: "image/jpeg", data: dataUrl };
}

async function* sseLines(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("data:")) yield t.slice(5).trim();
    }
  }
}

function classify(status: number, body: string): string {
  const b = body.toLowerCase();
  if (b.includes("api key not valid") || b.includes("api_key_invalid")) return "auth";
  if (b.includes("location is not supported")) return "region";
  if (status === 401 || status === 403) return "auth";
  if (status === 402 || b.includes("credit balance") || b.includes("billing")) return "billing";
  if (status === 429 || b.includes("rate limit") || b.includes("quota")) return "quota";
  if (status === 404 || b.includes("decommissioned") || b.includes("not found")) return "model";
  if (status >= 500 || b.includes("overloaded")) return "overloaded";
  return "other";
}

// ---------- Anthropic (Claude) ----------

async function openAnthropic(req: LLMRequest, model: string, withSearch: boolean) {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const msgs = normalize(req.messages);

  const apiMessages = msgs.map((m, i) => {
    const isLast = i === msgs.length - 1;
    if (isLast && m.role === "user" && req.imageDataUrl) {
      const { mediaType, data } = parseDataUrl(req.imageDataUrl);
      return {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text", text: m.content || "Décris cette image." },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const body: Record<string, unknown> = {
    model,
    max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS ?? 8192),
    stream: true,
    system: req.system,
    messages: apiMessages,
  };
  if (withSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];
  }

  return fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
}

async function* anthropicTokens(res: Response): AsyncGenerator<string> {
  const sources = new Map<string, string>();
  let emitted = "";
  let lastBlockWasText = false;

  for await (const data of sseLines(res.body!)) {
    let evt: any;
    try {
      evt = JSON.parse(data);
    } catch {
      continue;
    }

    if (evt.type === "error") {
      throw new Error(evt.error?.message ?? "Erreur du flux Anthropic");
    }

    if (evt.type === "content_block_start") {
      const block = evt.content_block;
      if (block?.type === "text") {
        // sépare proprement le texte écrit avant/après une recherche web
        if (emitted && !emitted.endsWith("\n")) {
          emitted += "\n\n";
          yield "\n\n";
        }
        lastBlockWasText = true;
      } else {
        lastBlockWasText = false;
      }
      if (block?.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r?.type === "web_search_result" && r.url && !sources.has(r.url)) {
            sources.set(r.url, r.title || r.url);
          }
        }
      }
    }

    if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta" && lastBlockWasText) {
      emitted += evt.delta.text;
      yield evt.delta.text as string;
    }
  }

  if (sources.size > 0 && emitted.trim()) {
    const list = [...sources.entries()]
      .slice(0, 6)
      .map(([url, title]) => `- [${title.replace(/[\[\]]/g, "")}](${url})`)
      .join("\n");
    yield `\n\n---\n**Sources**\n${list}`;
  }
}

// ---------- Groq (secours gratuit) ----------

function groqModels(hasImage: boolean): string[] {
  if (hasImage) {
    return [process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.8-27b"];
  }
  const chain = process.env.GROQ_MODELS ?? process.env.GROQ_MODEL ?? "openai/gpt-oss-120b,qwen/qwen3.6-27b";
  return chain.split(",").map((s) => s.trim()).filter(Boolean);
}

async function openGroq(req: LLMRequest, model: string) {
  const apiKey = process.env.GROQ_API_KEY!;
  const msgs = normalize(req.messages);
  const groqMessages = msgs.map((m, i) => {
    const isLast = i === msgs.length - 1;
    if (isLast && m.role === "user" && req.imageDataUrl) {
      const url = req.imageDataUrl.startsWith("data:")
        ? req.imageDataUrl
        : `data:image/jpeg;base64,${req.imageDataUrl}`;
      return {
        role: "user",
        content: [
          { type: "text", text: m.content || "Décris cette image." },
          { type: "image_url", image_url: { url } },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  return fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.6,
      max_tokens: 4000,
      messages: [{ role: "system", content: req.system }, ...groqMessages],
    }),
  });
}

async function* groqTokens(res: Response): AsyncGenerator<string> {
  for await (const data of sseLines(res.body!)) {
    if (data === "[DONE]") continue;
    try {
      const token = JSON.parse(data).choices?.[0]?.delta?.content;
      if (token) yield token as string;
    } catch {
      /* chunk malformé */
    }
  }
}

// ---------- Gemini (Google AI Studio, palier gratuit) ----------

async function openGemini(req: LLMRequest, model: string, withSearch: boolean) {
  const apiKey = process.env.GEMINI_API_KEY!;
  const msgs = normalize(req.messages);

  const contents = msgs.map((m, i) => {
    const isLast = i === msgs.length - 1;
    const parts: Record<string, unknown>[] = [];
    if (isLast && m.role === "user" && req.imageDataUrl) {
      const { mediaType, data } = parseDataUrl(req.imageDataUrl);
      parts.push({ inlineData: { mimeType: mediaType, data } });
    }
    parts.push({ text: m.content || "Décris cette image." });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  // Pas de "temperature" : Google recommande la valeur par défaut pour la série Gemini 3.
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents,
    generationConfig: { maxOutputTokens: Number(process.env.GEMINI_MAX_TOKENS ?? 8192) },
  };
  if (withSearch) body.tools = [{ google_search: {} }];

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    }
  );
}

async function* geminiTokens(res: Response): AsyncGenerator<string> {
  const sources = new Map<string, string>();
  let emitted = false;

  for await (const data of sseLines(res.body!)) {
    let evt: any;
    try {
      evt = JSON.parse(data);
    } catch {
      continue;
    }
    if (evt.error) throw new Error(evt.error.message ?? "Erreur du flux Gemini");

    const cand = evt.candidates?.[0];
    for (const part of cand?.content?.parts ?? []) {
      if (typeof part.text === "string" && !part.thought) {
        emitted = true;
        yield part.text as string;
      }
    }
    for (const c of cand?.groundingMetadata?.groundingChunks ?? []) {
      if (c?.web?.uri && !sources.has(c.web.uri)) sources.set(c.web.uri, c.web.title || c.web.uri);
    }
  }

  if (sources.size > 0 && emitted) {
    const list = [...sources.entries()]
      .slice(0, 6)
      .map(([url, title]) => `- [${title.replace(/[\[\]]/g, "")}](${url})`)
      .join("\n");
    yield `\n\n---\n**Sources**\n${list}`;
  }
}

// ---------- Orchestration ----------

type Provider = "anthropic" | "gemini" | "groq";
type Attempt = { provider: Provider; model: string; search: boolean };

function list(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback).split(",").map((s) => s.trim()).filter(Boolean);
}

function buildAttempts(req: LLMRequest): Attempt[] {
  const wantSearch = req.webSearch || process.env.WEB_SEARCH_ALWAYS === "true";
  const order = list(process.env.LLM_PROVIDER_ORDER, "anthropic,gemini,groq") as Provider[];
  const attempts: Attempt[] = [];

  for (const provider of order) {
    if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
      if (wantSearch) attempts.push({ provider, model, search: true });
      attempts.push({ provider, model, search: false });
    }

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      // Le palier gratuit n'inclut la recherche Google que sur la série 2.5 ;
      // on utilise donc un modèle dédié pour les questions avec recherche web.
      if (wantSearch) {
        attempts.push({
          provider,
          model: process.env.GEMINI_SEARCH_MODEL ?? "gemini-2.5-flash",
          search: true,
        });
      }
      for (const model of list(process.env.GEMINI_MODELS, "gemini-3.8-flash,gemini-2.5-flash")) {
        attempts.push({ provider, model, search: false });
      }
    }

    if (provider === "groq" && process.env.GROQ_API_KEY) {
      for (const model of groqModels(!!req.imageDataUrl)) {
        attempts.push({ provider, model, search: false });
      }
    }
  }
  return attempts;
}

export async function openStream(req: LLMRequest): Promise<OpenResult> {
  const attempts = buildAttempts(req);
  const log: string[] = [];
  const kinds: string[] = [];
  const dead = new Set<string>(); // "fournisseur:modèle" inutile de réessayer

  if (attempts.length === 0) {
    return {
      ok: false,
      attempts: log,
      friendlyMessage:
        "Aucune clé API configurée côté serveur (GEMINI_API_KEY, GROQ_API_KEY ou ANTHROPIC_API_KEY).",
    };
  }

  for (const a of attempts) {
    const key = `${a.provider}:${a.model}`;
    if (dead.has(key)) continue;

    try {
      const res =
        a.provider === "anthropic"
          ? await openAnthropic(req, a.model, a.search)
          : a.provider === "gemini"
          ? await openGemini(req, a.model, a.search)
          : await openGroq(req, a.model);

      if (res.ok && res.body) {
        const tokens =
          a.provider === "anthropic"
            ? () => anthropicTokens(res)
            : a.provider === "gemini"
            ? () => geminiTokens(res)
            : () => groqTokens(res);
        return { ok: true, stream: { provider: a.provider, model: a.model, tokens } };
      }

      const text = await res.text().catch(() => "");
      console.error(`[${a.provider}]`, res.status, a.model, a.search ? "(recherche)" : "", text.slice(0, 500));
      log.push(`${key}:${res.status}${a.search ? ":search" : ""}`);
      const kind = classify(res.status, text);
      kinds.push(kind);
      // Une erreur 400 avec recherche peut venir de l'outil seul : on laisse la tentative sans recherche.
      if (!(res.status === 400 && a.search)) dead.add(key);
    } catch (err) {
      console.error(`[${a.provider}] exception`, a.model, err);
      log.push(`${key}:network`);
      kinds.push("overloaded");
    }
  }

  let friendly = "Jessy est momentanément indisponible. Réessayez dans un instant.";
  if (kinds.includes("billing")) {
    friendly = "Les crédits d'un fournisseur d'IA sont épuisés. L'administrateur doit recharger le compte API.";
  } else if (kinds.every((k) => k === "quota")) {
    friendly = "Le quota gratuit des fournisseurs d'IA est atteint pour le moment. Réessayez un peu plus tard.";
  } else if (kinds.every((k) => k === "auth")) {
    friendly = "Les clés API des fournisseurs d'IA sont invalides ou expirées. L'administrateur doit les renouveler.";
  } else if (kinds.includes("region")) {
    friendly = "Le fournisseur d'IA n'est pas disponible depuis la région du serveur.";
  }
  return { ok: false, attempts: log, friendlyMessage: friendly };
}
