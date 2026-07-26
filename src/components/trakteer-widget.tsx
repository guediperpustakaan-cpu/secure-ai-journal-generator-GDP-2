"use client";

import QRCode from "qrcode";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const TRAKTEER_BASE_URL = "https://trakteer.id/perpus_opera/";
const amounts = [6_000, 12_000, 18_000, 30_000, 60_000, 120_000];

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildTrakteerUrl(amount: number): string {
  const url = new URL(TRAKTEER_BASE_URL);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("utm_source", "ai_journal_tools_generator");
  url.searchParams.set("utm_medium", "floating_widget");
  url.searchParams.set("utm_campaign", "server_support_mzf_2026");
  return url.toString();
}

export function TrakteerWidget() {
  const [open, setOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(amounts[0]);
  const [qrCode, setQrCode] = useState("");
  const [copied, setCopied] = useState(false);

  const paymentUrl = useMemo(() => buildTrakteerUrl(selectedAmount), [selectedAmount]);

  useEffect(() => {
    let active = true;
    if (!open) return;

    QRCode.toDataURL(paymentUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (active) setQrCode(dataUrl);
      })
      .catch(() => {
        if (active) setQrCode("");
      });

    return () => {
      active = false;
    };
  }, [open, paymentUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section className="w-[min(92vw,390px)] overflow-hidden rounded-[1.75rem] border border-orange-200 bg-white text-slate-900 shadow-2xl shadow-orange-950/20" aria-label="Panel traktiran Trakteer">
          <div className="bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 p-5 text-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-wide">Trakteer Perpus Opera</p>
                <h2 className="mt-1 text-2xl font-black leading-tight">Traktir kopi untuk bantu server?</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-slate-900 shadow-sm transition hover:bg-white" aria-label="Tutup widget Trakteer">
                ×
              </button>
            </div>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-800">
              Web app ini gratis & bebas iklan. Pilih nominal, lalu scan QR Code di bawah tanpa perlu berpindah halaman.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <p className="text-sm font-bold text-slate-700">Pilih nominal traktiran</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {amounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setSelectedAmount(amount)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                      selectedAmount === amount
                        ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                  >
                    {formatRupiah(amount)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Nominal dimulai dari Rp6.000 dan menggunakan kelipatannya.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="mb-3 text-sm font-bold text-slate-700">QR Code Trakteer</p>
              {qrCode ? (
                <Image src={qrCode} alt={`QR Code Trakteer sebesar ${formatRupiah(selectedAmount)}`} width={240} height={240} className="mx-auto h-56 w-56 rounded-2xl bg-white p-2 shadow-sm" />
              ) : (
                <div className="mx-auto grid h-56 w-56 place-items-center rounded-2xl bg-white text-sm text-slate-500">Menyiapkan QR...</div>
              )}
              <p className="mt-3 text-xs leading-5 text-slate-500">
                QR mengarah ke halaman resmi Trakteer Perpus Opera dengan metadata nominal {formatRupiah(selectedAmount)}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyLink} className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                {copied ? "Link Disalin" : "Salin Link"}
              </button>
              <a href={paymentUrl} target="_blank" rel="noreferrer noopener" className="flex-1 rounded-2xl bg-orange-100 px-4 py-3 text-center text-sm font-black text-orange-800 transition hover:bg-orange-200">
                Buka Trakteer
              </a>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="group flex max-w-[360px] items-center gap-3 rounded-full border border-orange-200 bg-gradient-to-r from-orange-500 to-amber-400 p-2 pr-4 text-left text-slate-950 shadow-2xl shadow-orange-950/30 transition hover:-translate-y-0.5 hover:shadow-orange-950/40 focus:outline-none focus:ring-4 focus:ring-orange-300"
        aria-expanded={open}
        aria-label="Buka widget Trakteer"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-2xl shadow-sm transition group-hover:rotate-[-8deg]">☕</span>
        <span className="hidden text-sm font-black leading-5 sm:block">
          Web app ini gratis & bebas iklan. Traktir kopi untuk bantu biaya server?
        </span>
        <span className="text-sm font-black sm:hidden">Traktir kopi?</span>
      </button>
    </div>
  );
}
