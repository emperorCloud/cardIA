"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogoMark } from "@/components/LogoMark";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };
type Conversation = { id: string; title: string; created_at: string };

const SUGGESTIONS = [
  "Explique-moi CARDIT en une phrase",
  "Rédige un e-mail de suivi client",
  "Résume ce texte pour moi",
  "Idées pour un projet tech au Cameroun",
];

export default function Home() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    if (!res.ok) return;
    const data: Conversation[] = await res.json();
    setConversations(data);
  }

  async function openConversation(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (!res.ok) {
      setMessages([]);
      return;
    }
    const data = await res.json();
    setMessages(
      data.map((m: { role: Role; content: string }) => ({ role: m.role, content: m.content }))
    );
  }

  async function newConversation() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nouvelle conversation" }),
    });
    const conv: Conversation = await res.json();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
    setSidebarOpen(false);
    return conv.id;
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    let conversationId = activeId;
    if (!conversationId) {
      conversationId = await newConversation();
    }

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, conversationId }),
      });

      if (!res.ok || !res.body) throw new Error("Réponse invalide du serveur");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: assistantText };
          return copy;
        });
      }

      loadConversations();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Désolé, une erreur est survenue en essayant de vous répondre. Réessayez dans un instant.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cardia-dark text-white">
      {/* Sidebar */}
      <aside
        className={`fixed z-30 h-full w-64 shrink-0 border-r border-white/5 bg-cardia-dark2 transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <LogoMark />
          <span className="text-lg font-semibold">
            Card<span className="text-cardia-violet">IA</span>
          </span>
        </div>

        <button
          onClick={() => newConversation()}
          className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center gap-2 rounded-xl bg-cardia-violet/90 px-4 py-2.5 text-sm font-medium transition hover:bg-cardia-violet"
        >
          + Nouveau chat
        </button>

        <p className="px-5 pb-1 text-[11px] uppercase tracking-wide text-white/30">Historique</p>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 text-sm text-white/60">
          {conversations.length === 0 && (
            <p className="px-3 py-2 text-xs text-white/30">Aucune conversation encore.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={`truncate rounded-lg px-3 py-2 text-left transition hover:bg-white/5 hover:text-white ${
                c.id === activeId ? "bg-white/10 text-white" : ""
              }`}
              title={c.title}
            >
              {c.title}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/5 px-5 py-4">
          <p className="truncate text-xs text-white/50">{session?.user?.name}</p>
          <p className="truncate text-[11px] text-white/30">{session?.user?.email}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-2 text-[11px] text-cardia-violet hover:underline"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/5 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
            >
              ☰
            </button>
            <div>
              <p className="text-sm font-medium text-white/90">Jessy</p>
              <p className="text-xs text-white/40">Assistant IA · CardIA par CARDIT</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-cardia-cyan/10 px-3 py-1 text-xs text-cardia-cyan sm:inline-block">
            En ligne
          </span>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.length === 0 && (
              <div className="mt-8 flex flex-col items-center text-center">
                <LogoMark size={56} />
                <h1 className="mt-4 text-2xl font-semibold">Bonjour, je suis Jessy</h1>
                <p className="mt-2 max-w-sm text-sm text-white/50">
                  Votre assistant IA CardIA, conçu par CARDIT. Posez-moi vos questions,
                  demandez une analyse, une idée, un document — je suis là pour vous.
                </p>
                <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-xl border border-white/10 bg-cardia-panel/60 px-4 py-3 text-left text-sm text-white/70 transition hover:border-cardia-violet/50 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-cardia-blue text-white"
                      : "bg-cardia-panel text-white/90"
                  }`}
                >
                  {m.content || (m.role === "assistant" && loading ? <TypingDots /> : "")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/5 px-4 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-white/10 bg-cardia-panel/60 px-3 py-2 focus-within:border-cardia-violet/60"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Écrivez votre message..."
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cardia-violet transition disabled:opacity-40"
              aria-label="Envoyer"
            >
              ➤
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-white/30">
            Jessy peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 py-1">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-white/60" />
      <span
        className="typing-dot h-1.5 w-1.5 rounded-full bg-white/60"
        style={{ animationDelay: "0.15s" }}
      />
      <span
        className="typing-dot h-1.5 w-1.5 rounded-full bg-white/60"
        style={{ animationDelay: "0.3s" }}
      />
    </span>
  );
}
