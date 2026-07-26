import JSZip from "jszip";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const MAX_FILE_BYTES = 700_000;
const EXCLUDED_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  ".vercel",
  "coverage",
  "dist",
  "build",
  ".turbo",
]);
const EXCLUDED_FILES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "package-lock.json",
]);
const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".md",
  ".mjs",
  ".cjs",
  ".sql",
  ".txt",
]);

async function addDirectory(zip: JSZip, directory: string) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".gitignore") {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(ROOT, absolutePath).replaceAll(path.sep, "/");

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        await addDirectory(zip, absolutePath);
      }
      continue;
    }

    if (!entry.isFile() || EXCLUDED_FILES.has(entry.name)) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      continue;
    }

    const fileStat = await stat(absolutePath);
    if (fileStat.size > MAX_FILE_BYTES) {
      continue;
    }

    const content = await readFile(absolutePath);
    zip.file(relativePath, content);
  }
}

export async function GET() {
  try {
    const zip = new JSZip();
    zip.file(
      "README-SOURCE-DOWNLOAD.txt",
      [
        "AI Journal Tools Generator",
        "Open Source oleh MZF - 2026",
        "",
        "Arsip ini dibuat secara dinamis dari source code aplikasi.",
        "File rahasia seperti .env, node_modules, build output, dan cache tidak disertakan.",
        "Lihat SECURITY_ARCHITECTURE.md dan docs/TRAKTEER_WIDGET.md untuk dokumentasi.",
      ].join("\n"),
    );

    await addDirectory(zip, ROOT);
    const archive = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

    return new Response(archive, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="ai-journal-tools-generator-mzf-2026-source.zip"',
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ ok: false, error: "Source code tidak dapat disiapkan" }, { status: 500 });
  }
}
