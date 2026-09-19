//app/api/extract-file/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as officeParser from "officeparser";
import AdmZip from "adm-zip";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";

const DOCUMENT_EXTENSIONS = [
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
];

const SUPPORTED_EXTENSIONS = [...DOCUMENT_EXTENSIONS, ".zip"];

const MAX_SIZE = 15 * 1024 * 1024; // 15 Mo
const MAX_FILES_IN_ZIP = 15;

async function extractOne(buffer: Buffer, ext: string): Promise<string> {
  if (ext === ".txt" || ext === ".md" || ext === ".csv") {
    return buffer.toString("utf-8");
  }

  const tempPath = path.join(tmpdir(), `${randomUUID()}${ext}`);
    try {
      await writeFile(tempPath, buffer);
      const ast = await officeParser.parseOffice(tempPath);
      return ast.toText(); // méthode synchrone, retourne une string
    } finally {
      await unlink(tempPath).catch(() => {});
    }
}

async function extractZip(buffer: Buffer): Promise<string> {
  const zip = new AdmZip(buffer);
  const entries = zip
    .getEntries()
    .filter((e) => !e.isDirectory)
    .slice(0, MAX_FILES_IN_ZIP);

  if (entries.length === 0) {
    return "(Archive vide ou sans fichier lisible.)";
  }

  const parts: string[] = [];

  for (const entry of entries) {
    const entryExt = path.extname(entry.entryName).toLowerCase();
    if (!DOCUMENT_EXTENSIONS.includes(entryExt)) {
      parts.push(`### ${entry.entryName} ###\n(Format non extrait : ${entryExt || "inconnu"})`);
      continue;
    }
    try {
      const entryBuffer = entry.getData();
      const text = await extractOne(entryBuffer, entryExt);
      parts.push(`### ${entry.entryName} ###\n${text.trim()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "erreur inconnue";
      parts.push(`### ${entry.entryName} ###\n(Extraction impossible : ${message})`);
    }
  }

  const skipped = zip.getEntries().filter((e) => !e.isDirectory).length - entries.length;
  if (skipped > 0) {
    parts.push(`(${skipped} fichier(s) supplémentaire(s) ignoré(s) — limite de ${MAX_FILES_IN_ZIP} par archive.)`);
  }

  return parts.join("\n\n");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }

  const originalName = (file as File).name || "fichier";
  const ext = path.extname(originalName).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      {
        error: `Format non supporté (${ext || "inconnu"}). Formats acceptés : PDF, Word, PowerPoint, Excel, ODT/ODP/ODS, RTF, CSV, TXT, MD, ou une archive ZIP les contenant.`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 15 Mo)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const text =
      ext === ".zip" ? await extractZip(buffer) : await extractOne(buffer, ext);
    return NextResponse.json({ text, filename: originalName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Impossible d'extraire le texte de ce fichier : ${message}` },
      { status: 500 }
    );
  }
}
