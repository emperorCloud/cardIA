"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogoMark } from "@/components/LogoMark";

type Role = "user" | "assistant";
type Message = {
  role: Role;
  content: string;
  imageUrl?: string; // image générée par Jessy, ou image jointe par l'utilisateur
};
type Conversation = { id: string; title: string; created_at: string };

const SUGGESTIONS = [
  "Explique-moi CARDIT en une phrase",
  "Rédige un e-mail de suivi client",
  "Résume ce texte pour moi",
  "Idées pour un projet tech au Cameroun",
];

const SUPPORTED_DOC_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".odt",
  ".odp",
  ".ods",
  ".rtf",
  ".csv",
  ".txt",
  ".md",
  ".zip",
];

export default function Home() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [extractingFile, setExtractingFile] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null); // data URL
  const [pendingFileNote, setPendingFileNote] = useState<string | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileTextRef = useRef<string>("");

  useEffect(() => {
    loadConversations();
    return () => {
      window.speechSynthesis?.cancel();
    };
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

  function clearAttachments() {
    setPendingImage(null);
    setPendingFileNote(null);
    pendingFileTextRef.current = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImage(reader.result as string);
        setPendingFileNote(null);
        pendingFileTextRef.current = "";
      };
      reader.readAsDataURL(file);
      return;
    }

    if (!SUPPORTED_DOC_EXTENSIONS.includes(ext)) {
      alert(
        "Formats acceptés : images, PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), ODT/ODP/ODS, RTF, CSV, TXT, MD, ou une archive ZIP les contenant."
      );
      return;
    }

    setExtractingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract-file", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? "Impossible d'extraire le contenu de ce fichier.");
        return;
      }

      pendingFileTextRef.current = data.text;
      setPendingFileNote(file.name);
      setPendingImage(null);
    } catch {
      alert("Erreur pendant l'extraction du fichier.");
    } finally {
      setExtractingFile(false);
    }
  }

  async function send(text?: string) {
    const rawContent = (text ?? input).trim();
    if ((!rawContent && !pendingImage && !pendingFileNote) || loading) return;

    let conversationId = activeId;
    if (!conversationId) {
      conversationId = await newConversation();
    }

    let content = rawContent;
    if (pendingFileNote && pendingFileTextRef.current) {
      content = `[Fichier joint : ${pendingFileNote}]\n${pendingFileTextRef.current}\n\n${rawContent}`.trim();
    }

    const imageForRequest = pendingImage;
    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: rawContent || "(image envoyée)", imageUrl: pendingImage ?? undefined },
    ];
    setMessages(nextMessages);
    setInput("");
    clearAttachments();
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content }],
          conversationId,
          webSearch,
          imageBase64: imageForRequest ?? undefined,
        }),
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

  async function generateImage() {
    const prompt = input.trim();
    if (!prompt || generatingImage) return;

    setMessages((prev) => [...prev, { role: "user", content: `🎨 ${prompt}` }]);
    setInput("");
    setGeneratingImage(true);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.url) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Voici ce que j'ai généré :", imageUrl: data.url },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Je n'ai pas réussi à générer cette image. Réessaie avec une description différente." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erreur pendant la génération de l'image." },
      ]);
    } finally {
      setGeneratingImage(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return;

        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "message.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          if (data.text) {
            setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
          }
        } catch {
          // silencieux — l'utilisateur peut taper à la place
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert("Accès au micro refusé ou indisponible.");
    }
  }

  function copyMessage(text: string, index: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  }

  function editMessage(text: string) {
    setInput(text);
    window.scrollTo({ top: document.body.scrollHeight });
  }

  function speakMessage(text: string, index: number) {
    if (!("speechSynthesis" in window)) {
      alert("La lecture audio n'est pas supportée par ce navigateur.");
      return;
    }
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  function downloadMessage(text: string, index: number) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jessy-reponse-${index + 1}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
                  demandez une analyse, une image, un fichier — je suis là pour vous.
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
              <div key={i} className={`group flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-cardia-blue text-white"
                      : "bg-cardia-panel text-white/90"
                  }`}
                >
                  {m.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt="Image"
                      className="mb-2 max-h-64 rounded-lg object-cover"
                    />
                  )}
                  {m.content || (m.role === "assistant" && loading && i === messages.length - 1 ? (
                    <TypingDots />
                  ) : (
                    ""
                  ))}
                </div>

                {m.content && (
                  <div className="mt-1 flex gap-2 text-[11px] text-white/30 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => copyMessage(m.content, i)} className="hover:text-white/70">
                      {copiedIndex === i ? "Copié ✓" : "Copier"}
                    </button>
                    {m.role === "user" ? (
                      <button onClick={() => editMessage(m.content)} className="hover:text-white/70">
                        Modifier
                      </button>
                    ) : (
                      <>
                        <button onClick={() => speakMessage(m.content, i)} className="hover:text-white/70">
                          {speakingIndex === i ? "⏹ Arrêter" : "🔊 Écouter"}
                        </button>
                        <button onClick={() => downloadMessage(m.content, i)} className="hover:text-white/70">
                          ⬇ Télécharger
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/5 px-4 py-4">
          <div className="mx-auto max-w-2xl">
            {(pendingImage || pendingFileNote) && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-cardia-panel/60 px-3 py-2 text-xs text-white/60">
                {pendingImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingImage} alt="aperçu" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <span>📄</span>
                )}
                <span className="flex-1 truncate">{pendingFileNote ?? "Image jointe"}</span>
                <button onClick={clearAttachments} className="text-white/40 hover:text-white">
                  ✕
                </button>
              </div>
            )}

            <div className="mb-2 flex items-center gap-2">
              <button
                onClick={() => setWebSearch((v) => !v)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  webSearch
                    ? "bg-cardia-cyan/20 text-cardia-cyan"
                    : "bg-white/5 text-white/40 hover:text-white/70"
                }`}
                title="Active la recherche web en temps réel pour la prochaine question"
              >
                🌐 Recherche web {webSearch ? "activée" : ""}
              </button>
              <button
                onClick={generateImage}
                disabled={!input.trim() || generatingImage}
                className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40 transition hover:text-white/70 disabled:opacity-40"
                title="Génère une image à partir du texte saisi"
              >
                {generatingImage ? "🎨 Génération..." : "🎨 Générer une image"}
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-2 rounded-2xl border border-white/10 bg-cardia-panel/60 px-3 py-2 focus-within:border-cardia-violet/60"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.docx,.pptx,.xlsx,.odt,.odp,.ods,.rtf,.csv,.txt,.md,.zip"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={extractingFile}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70 transition hover:bg-white/20 disabled:opacity-40"
                aria-label="Joindre un fichier"
                title="Joindre une image, un PDF, un Word, PowerPoint ou Excel"
              >
                {extractingFile ? "⏳" : "📎"}
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  transcribing
                    ? "Transcription en cours..."
                    : extractingFile
                    ? "Extraction du fichier en cours..."
                    : "Écrivez votre message..."
                }
                rows={1}
                disabled={transcribing || extractingFile}
                className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={toggleRecording}
                disabled={transcribing}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-40 ${
                  recording ? "bg-red-500 animate-pulse" : "bg-white/10 hover:bg-white/20"
                }`}
                aria-label={recording ? "Arrêter l'enregistrement" : "Message vocal"}
                title={recording ? "Arrêter l'enregistrement" : "Message vocal"}
              >
                {recording ? "⏹" : "🎤"}
              </button>
              <button
                type="submit"
                disabled={loading || transcribing || extractingFile || (!input.trim() && !pendingImage && !pendingFileNote)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cardia-violet transition disabled:opacity-40"
                aria-label="Envoyer"
              >
                ➤
              </button>
            </form>
            <p className="mt-2 text-center text-[11px] text-white/30">
              {recording
                ? "Enregistrement en cours — cliquez sur ⏹ pour arrêter."
                : "Jessy peut faire des erreurs. Vérifiez les informations importantes."}
            </p>
          </div>
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
