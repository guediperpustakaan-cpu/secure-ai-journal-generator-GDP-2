"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type User = {
  id: string;
  email: string;
  displayName: string;
};

type JournalRecord = {
  id: string;
  title: string;
  template: string;
  mood: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const templates = ["Refleksi Harian", "Jurnal Syukur", "Jurnal Produktivitas"];
const moods = ["Tenang", "Bahagia", "Lelah", "Cemas", "Termotivasi", "Sedih", "Campur Aduk"];

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.ok) {
    throw new Error(payload.error || "Terjadi kesalahan");
  }
  return payload.data;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleFromMarkdown(markdown: string): string {
  const firstHeading = markdown
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(Boolean);
  return (firstHeading || "Jurnal Baru").slice(0, 120);
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function MarkdownPreview({ value }: { value: string }) {
  const lines = value.split("\n");
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`list-${nodes.length}`} className="my-3 list-disc space-y-1 pl-6 text-slate-700">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/) ?? trimmed.match(/^\d+\.\s+(.+)$/);
    if (listMatch) {
      listItems.push(listMatch[1] ?? "");
      return;
    }

    flushList();
    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h1 key={index} className="mt-4 text-2xl font-bold text-slate-950">
          {renderInline(trimmed.slice(2))}
        </h1>,
      );
    } else if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2 key={index} className="mt-4 text-lg font-semibold text-slate-900">
          {renderInline(trimmed.slice(3))}
        </h2>,
      );
    } else if (trimmed.startsWith("> ")) {
      nodes.push(
        <blockquote key={index} className="my-3 rounded-2xl border-l-4 border-teal-400 bg-teal-50 p-4 text-slate-700">
          {renderInline(trimmed.slice(2))}
        </blockquote>,
      );
    } else {
      nodes.push(
        <p key={index} className="my-2 leading-7 text-slate-700">
          {renderInline(trimmed)}
        </p>,
      );
    }
  });
  flushList();

  return <article className="prose-slate max-w-none">{nodes}</article>;
}

export function JournalApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [journals, setJournals] = useState<JournalRecord[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [selectedMood, setSelectedMood] = useState("Tenang");
  const [daySummary, setDaySummary] = useState("");
  const [focus, setFocus] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  const canSave = useMemo(() => editorContent.trim().length > 0, [editorContent]);

  async function loadJournals() {
    const data = await apiRequest<{ journals: JournalRecord[] }>("/api/journals");
    setJournals(data.journals);
  }

  useEffect(() => {
    let active = true;
    apiRequest<{ user: User | null }>("/api/auth/me")
      .then(async (data) => {
        if (!active) return;
        setUser(data.user);
        if (data.user) {
          await loadJournals();
        }
      })
      .catch(() => setMessage("Sesi tidak dapat diperiksa"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await apiRequest<{ user: User }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
      setUser(data.user);
      await loadJournals();
      setMessage("Berhasil masuk. Selamat menulis jurnal.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Autentikasi gagal");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await apiRequest<{ signedOut: boolean }>("/api/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
      setJournals([]);
      setEditorContent("");
      setActiveJournalId(null);
      setMessage("Anda telah keluar.");
    } finally {
      setBusy(false);
    }
  }

  async function generateJournal() {
    setBusy(true);
    setMessage("");
    try {
      const data = await apiRequest<{ journal: string }>("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({ template: selectedTemplate, mood: selectedMood, daySummary, focus }),
      });
      setEditorContent(data.journal);
      setActiveJournalId(null);
      setPreviewMode("edit");
      setMessage("Draft jurnal berhasil dibuat. Anda bisa mengedit sebelum menyimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal membuat jurnal");
    } finally {
      setBusy(false);
    }
  }

  async function saveJournal() {
    if (!canSave) {
      setMessage("Isi jurnal tidak boleh kosong.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const body = JSON.stringify({
        title: titleFromMarkdown(editorContent),
        template: selectedTemplate,
        mood: selectedMood,
        content: editorContent,
      });
      const endpoint = activeJournalId ? `/api/journals/${activeJournalId}` : "/api/journals";
      const method = activeJournalId ? "PUT" : "POST";
      const data = await apiRequest<{ journal: JournalRecord }>(endpoint, { method, body });
      setActiveJournalId(data.journal.id);
      await loadJournals();
      setMessage("Jurnal berhasil disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Jurnal gagal disimpan");
    } finally {
      setBusy(false);
    }
  }

  async function openJournal(journal: JournalRecord) {
    setBusy(true);
    setMessage("");
    try {
      setEditorContent(journal.content);
      setSelectedTemplate(journal.template);
      setSelectedMood(journal.mood);
      setActiveJournalId(journal.id);
      setPreviewMode("edit");
      setMessage("Jurnal berhasil dibuka.");
    } catch {
      setMessage("Gagal membuka jurnal.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteJournal(id: string) {
    if (!confirm("Hapus jurnal ini secara permanen?")) return;
    setBusy(true);
    setMessage("");
    try {
      await apiRequest<{ deleted: boolean }>(`/api/journals/${id}`, { method: "DELETE" });
      if (activeJournalId === id) {
        setActiveJournalId(null);
        setEditorContent("");
      }
      await loadJournals();
      setMessage("Jurnal berhasil dihapus.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Jurnal gagal dihapus");
    } finally {
      setBusy(false);
    }
  }

  function exportText() {
    const blob = new Blob([editorContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${titleFromMarkdown(editorContent).replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setMessage("Popup diblokir. Izinkan popup untuk ekspor PDF.");
      return;
    }
    printWindow.document.title = titleFromMarkdown(editorContent);
    const style = printWindow.document.createElement("style");
    style.textContent = "body{font-family:Arial,sans-serif;padding:32px;color:#0f172a}pre{white-space:pre-wrap;line-height:1.65;font-size:14px}";
    const pre = printWindow.document.createElement("pre");
    pre.textContent = editorContent;
    printWindow.document.head.appendChild(style);
    printWindow.document.body.appendChild(pre);
    printWindow.print();
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <div className="mb-4 h-2 w-48 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-teal-300" />
          </div>
          <p>Memuat ruang jurnal aman...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1,transparent_35%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-teal-200 bg-white/80 px-4 py-2 text-sm font-medium text-teal-800 shadow-sm">
              AI Journal Tools Generator • Aman sejak desain awal
            </span>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
                Buat jurnal terstruktur dalam 3 klik, simpan terenkripsi.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
                Pilih template, pilih suasana hati, lalu biarkan AI membantu menyusun refleksi berbahasa Indonesia. Konten jurnal dienkripsi di perangkat Anda sebelum masuk database.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/api/source/download" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:bg-teal-700">
                  Download Source Code
                </a>
                <span className="rounded-2xl border border-teal-200 bg-white/75 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm">
                  Open Source oleh MZF - 2026
                </span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["RLS", "Database membatasi jurnal per pengguna."],
                ["AES-256", "Enkripsi client-side dengan AES-GCM."],
                ["Rate Limit", "Endpoint AI dilindungi dari penyalahgunaan."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur">
                  <h3 className="font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={submitAuth} className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-teal-900/10 backdrop-blur sm:p-8">
            <div className="mb-6 flex rounded-2xl bg-slate-100 p-1">
              <button type="button" onClick={() => setAuthMode("register")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${authMode === "register" ? "bg-slate-950 text-white shadow" : "text-slate-600"}`}>
                Daftar
              </button>
              <button type="button" onClick={() => setAuthMode("login")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${authMode === "login" ? "bg-slate-950 text-white shadow" : "text-slate-600"}`}>
                Masuk
              </button>
            </div>
            <div className="space-y-4">
              {authMode === "register" && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Nama</span>
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-teal-300 transition focus:ring-4" placeholder="Nama Anda" />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-teal-300 transition focus:ring-4" placeholder="nama@email.com" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Password</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-teal-300 transition focus:ring-4" placeholder="Minimal 10 karakter, Aa dan angka" required />
              </label>
              <button disabled={busy} className="w-full rounded-2xl bg-teal-600 px-5 py-4 font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? "Memproses..." : authMode === "register" ? "Buat Akun Aman" : "Masuk ke Dashboard"}
              </button>
              {message && <p className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
            </div>
          </form>
        </section>
        <footer className="mx-auto mt-10 max-w-6xl pb-24 text-center text-sm font-semibold text-slate-600 sm:pb-12">
          Open Source oleh MZF - 2026 • <a href="/api/source/download" className="text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900">Download source code web app ini</a>
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-teal-300">AI Journal Tools Generator</p>
            <h1 className="text-2xl font-black">Dashboard Jurnal Aman</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/api/source/download" className="rounded-full border border-teal-300/30 bg-teal-300/10 px-4 py-2 text-sm font-bold text-teal-100 transition hover:bg-teal-300/20">
              Download Source Code
            </a>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">{user.displayName}</span>
            <button onClick={logout} disabled={busy} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-teal-100 disabled:opacity-60">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-5">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Jurnal Tersimpan</h2>
              <span className="rounded-full bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-200">{journals.length}</span>
            </div>
            <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
              {journals.length === 0 && <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-400">Belum ada jurnal. Buat draft pertama Anda.</p>}
              {journals.map((journal) => (
                <article key={journal.id} className={`rounded-2xl border p-4 transition ${activeJournalId === journal.id ? "border-teal-300 bg-teal-300/10" : "border-white/10 bg-slate-900/80"}`}>
                  <h3 className="font-bold text-white">{journal.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{journal.template} • {journal.mood}</p>
                  <p className="mt-1 text-xs text-slate-500">Diperbarui {formatDate(journal.updatedAt)}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => openJournal(journal)} disabled={busy} className="rounded-xl bg-teal-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60">Buka</button>
                    <button onClick={() => deleteJournal(journal.id)} disabled={busy} className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/25 disabled:opacity-60">Hapus</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Generator 3 klik</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Buat draft jurnal AI</h2>
              </div>
              <button onClick={generateJournal} disabled={busy || daySummary.trim().length < 3} className="rounded-2xl bg-slate-950 px-6 py-4 font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? "Memproses..." : "Buat Jurnal"}
              </button>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              <div>
                <label className="text-sm font-bold text-slate-700">Template</label>
                <div className="mt-2 grid gap-2">
                  {templates.map((template) => (
                    <button key={template} onClick={() => setSelectedTemplate(template)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${selectedTemplate === template ? "border-teal-500 bg-teal-50 text-teal-900" : "border-slate-200 hover:border-teal-200"}`}>
                      {template}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Suasana hati</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {moods.map((mood) => (
                    <button key={mood} onClick={() => setSelectedMood(mood)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${selectedMood === mood ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 hover:border-slate-400"}`}>
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Ringkasan hari</span>
                  <textarea value={daySummary} onChange={(event) => setDaySummary(event.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-teal-300 transition focus:ring-4" placeholder="Contoh: Hari ini cukup padat, saya menyelesaikan pekerjaan penting..." />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Fokus opsional</span>
                  <input value={focus} onChange={(event) => setFocus(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-teal-300 transition focus:ring-4" placeholder="Contoh: lebih tenang, lebih produktif" />
                </label>
              </div>
            </div>
          </section>

          {message && <p className="rounded-2xl border border-teal-300/30 bg-teal-300/10 p-4 text-sm text-teal-50">{message}</p>}

          <section className="rounded-[2rem] border border-white/10 bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Editor Markdown</p>
                <h2 className="text-2xl font-black text-slate-950">Edit, preview, lalu simpan</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setPreviewMode("edit")} className={`rounded-full px-4 py-2 text-sm font-bold ${previewMode === "edit" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>Edit</button>
                <button onClick={() => setPreviewMode("preview")} className={`rounded-full px-4 py-2 text-sm font-bold ${previewMode === "preview" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>Preview</button>
              </div>
            </div>

            <div className="mt-5 min-h-[440px] rounded-3xl border border-slate-200 bg-slate-50 p-3">
              {previewMode === "edit" ? (
                <textarea value={editorContent} onChange={(event) => setEditorContent(event.target.value)} className="h-[440px] w-full resize-y rounded-2xl border-0 bg-white p-5 font-mono text-sm leading-7 text-slate-800 outline-none ring-teal-300 transition focus:ring-4" placeholder="Draft AI atau tulisan Anda akan muncul di sini..." />
              ) : (
                <div className="min-h-[440px] rounded-2xl bg-white p-5">
                  {editorContent ? <MarkdownPreview value={editorContent} /> : <p className="text-slate-500">Belum ada konten untuk dipreview.</p>}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={saveJournal} disabled={busy || !canSave} className="rounded-2xl bg-teal-600 px-5 py-3 font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                {activeJournalId ? "Simpan Perubahan" : "Simpan Jurnal"}
              </button>
              <button onClick={exportText} disabled={!editorContent} className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-200 disabled:opacity-50">Ekspor TXT</button>
              <button onClick={exportPdf} disabled={!editorContent} className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-200 disabled:opacity-50">Simpan sebagai PDF</button>
              <button onClick={() => { setActiveJournalId(null); setEditorContent(""); }} className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-900">Jurnal Baru</button>
            </div>
          </section>
        </div>
      </section>
      <footer className="mx-auto max-w-7xl px-4 pb-28 pt-2 text-center text-sm font-semibold text-slate-400 sm:px-6 lg:px-8">
        Open Source oleh MZF - 2026 • <a href="/api/source/download" className="text-teal-300 underline decoration-teal-400/60 underline-offset-4 hover:text-teal-100">Download source code web app ini</a>
      </footer>
    </main>
  );
}
