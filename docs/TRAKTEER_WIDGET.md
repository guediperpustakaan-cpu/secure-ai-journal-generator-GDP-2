# Dokumentasi Floating Widget Trakteer

## Ringkasan

Aplikasi menyertakan Floating Widget khas Trakteer di sudut kanan bawah layar. Widget ini menampilkan ajakan:

> Web app ini gratis & bebas iklan. Traktir kopi untuk bantu biaya server?

Saat diklik, pengguna tetap berada di halaman web app dan melihat panel dukungan berisi:

- Pilihan nominal traktiran mulai dari **Rp6.000** dan kelipatannya.
- QR Code yang dibuat langsung di browser.
- Tombol salin link Trakteer.
- Tombol opsional untuk membuka halaman Trakteer resmi di tab baru.

Widget mengarah ke:

```text
https://trakteer.id/perpus_opera/
```

## File Implementasi

- Komponen UI widget: `src/components/trakteer-widget.tsx`
- Pemasangan widget global: `src/app/page.tsx`
- Endpoint unduh source code: `src/app/api/source/download/route.ts`
- Dokumentasi arsitektur keamanan umum: `SECURITY_ARCHITECTURE.md`

## Perilaku UX

### Posisi

Widget selalu berada di:

- Desktop: kanan bawah dengan teks lengkap.
- Mobile: kanan bawah dengan label pendek agar tidak menutup layar.

### State Tertutup

Widget tampil sebagai tombol floating berbentuk pill dengan ikon kopi dan teks ajakan.

### State Terbuka

Widget membuka panel in-app, bukan redirect. Panel berisi:

1. Header gradient orange/amber agar menyerupai gaya visual dukungan kreator.
2. Pilihan nominal:
   - Rp6.000
   - Rp12.000
   - Rp18.000
   - Rp30.000
   - Rp60.000
   - Rp120.000
3. QR Code dinamis berdasarkan nominal terpilih.
4. Tombol salin link.
5. Tombol opsional `Buka Trakteer` yang membuka tab baru hanya jika pengguna memilihnya secara eksplisit.

## QR Code

QR Code dibuat di client menggunakan package `qrcode`. Ini menghindari ketergantungan ke layanan QR pihak ketiga sehingga:

- Tidak ada request gambar QR ke domain eksternal.
- Lebih cepat.
- Lebih privat.
- Tetap sesuai Content Security Policy karena QR ditampilkan sebagai `data:` image.

URL QR dibuat dari base URL Trakteer dan metadata nominal:

```text
https://trakteer.id/perpus_opera/?amount=6000&utm_source=ai_journal_tools_generator&utm_medium=floating_widget&utm_campaign=server_support_mzf_2026
```

Catatan: parameter `amount` dan `utm_*` dikirim sebagai metadata URL. Jika Trakteer mengabaikan parameter nominal, pengguna tetap akan diarahkan ke halaman resmi Perpus Opera saat QR dipindai.

## Keamanan Widget

- QR dibuat lokal di browser, bukan melalui layanan QR publik.
- Tidak ada API key atau secret pada widget.
- Link eksternal memakai `target="_blank"` dan `rel="noreferrer noopener"`.
- Widget tidak menyimpan data pembayaran.
- Widget tidak membaca data jurnal.
- QR hanya berisi URL Trakteer publik dan parameter nominal.
- CSP aplikasi sudah mengizinkan `img-src 'self' data: blob:` untuk mendukung QR data URL.

## Source Code Download

Aplikasi menyediakan tombol/tulisan:

- `Download Source Code`
- `Download source code web app ini`

Endpoint:

```text
GET /api/source/download
```

Endpoint membuat arsip ZIP secara dinamis menggunakan `jszip`.

### File yang Disertakan

Source code dan dokumentasi teks yang aman, seperti:

- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.json`
- `.css`
- `.md`
- `.sql`
- `.txt`

### File/Folder yang Dikecualikan

Untuk keamanan dan ukuran arsip, endpoint mengecualikan:

- `.env`
- `.env.local`
- `.env.production`
- `.env.development`
- `node_modules`
- `.next`
- `.git`
- `.vercel`
- cache/build output
- `package-lock.json`
- file besar di atas batas internal

### Identitas Open Source

Kredit yang ditampilkan di UI dan arsip source:

```text
Open Source oleh MZF - 2026
```

## Cara Mengubah Nominal

Nominal berada pada array `amounts` di `src/components/trakteer-widget.tsx`. Semua nominal saat ini merupakan kelipatan Rp6.000.

Jika ingin menambah nominal, pastikan tetap kelipatan Rp6.000 agar sesuai requirement.

## Cara Mengubah Tujuan Trakteer

Base URL berada pada konstanta:

```text
TRAKTEER_BASE_URL
```

Nilai saat ini:

```text
https://trakteer.id/perpus_opera/
```

## Deployment Notes

- Tidak perlu environment variable tambahan untuk widget Trakteer.
- Untuk AI provider, gunakan `OPENAI_API_KEY` pada server environment bila ingin memakai OpenAI sungguhan.
- Untuk PostgreSQL, gunakan `DATABASE_URL`.
- Setelah schema dipush, jalankan `npx drizzle-kit push` untuk menerapkan struktur database.

## Checklist Pengujian Manual

1. Buka halaman utama.
2. Pastikan widget kopi muncul di kanan bawah.
3. Klik widget.
4. Pilih nominal Rp6.000 atau kelipatannya.
5. Pastikan QR Code berubah/tetap termuat sesuai nominal.
6. Klik `Salin Link` dan pastikan browser menyalin URL.
7. Klik `Download Source Code` dan pastikan file ZIP terunduh.
8. Pastikan footer menampilkan `Open Source oleh MZF - 2026`.

## Status Implementasi

- Floating widget: selesai.
- Pilihan nominal kelipatan Rp6.000: selesai.
- QR Code in-app: selesai.
- Tidak redirect saat klik widget: selesai.
- Tombol unduh source code: selesai.
- Kredit open-source MZF 2026: selesai.
