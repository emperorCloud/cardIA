"use client";

import { Children, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const child = Children.toArray(children)[0];

  let lang = "";
  let text = "";
  if (isValidElement(child)) {
    const el = child as ReactElement<{ className?: string; children?: ReactNode }>;
    lang = /language-([\w-]+)/.exec(el.props.className ?? "")?.[1] ?? "";
    text = String(el.props.children ?? "").replace(/\n$/, "");
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-[#050b18]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-white/40">
        <span>{lang || "code"}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="hover:text-white/80"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed text-white/90">
        <code>{text}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-semibold text-white first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold text-white first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold text-white first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-cardia-violet">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-cardia-violet">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-cardia-violet pl-3 text-white/70">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-white/10" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-cardia-cyan underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
  th: ({ children }) => <th className="border-b border-white/10 px-3 py-2 font-semibold text-white">{children}</th>,
  td: ({ children }) => <td className="border-b border-white/5 px-3 py-2 align-top">{children}</td>,
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  code: ({ children }) => (
    <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.85em] text-[#9ecbff]">{children}</code>
  ),
};

export function Markdown({ content }: { content: string }) {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Retire la syntaxe Markdown pour la lecture audio (sinon la voix lit « astérisque »).
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " (extrait de code) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/^\s*\|?[-:| ]+\|?\s*$/gm, "")
    .replace(/\|/g, ", ")
    .replace(/^---$/gm, "")
    .replace(/\n{2,}/g, ". ")
    .trim();
}
