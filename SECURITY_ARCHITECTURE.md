# AI Journal Tools Generator — Security Architecture

## Runtime Architecture

- **Frontend:** React components inside Next.js App Router, styled with Tailwind CSS. UI text and generated output are in Bahasa Indonesia.
- **Backend:** Next.js Route Handlers provide auth, journal CRUD, health checks, and AI generation proxy endpoints.
- **Database:** PostgreSQL through Drizzle ORM. The schema is compatible with managed PostgreSQL providers such as Supabase or Neon.
- **AI Provider:** NVIDIA NIM API (primary) or OpenAI Chat Completions (fallback) via a server-side proxy when API keys are configured. A deterministic Indonesian fallback keeps the sandbox functional without secrets.
- **Donation Widget:** A client-side Trakteer floating widget generates an in-app QR Code for `https://trakteer.id/perpus_opera/` without redirecting users on widget open.
- **Open Source Distribution:** A controlled source ZIP endpoint allows users to download the app source while excluding secrets, dependencies, and build artifacts.

## Database Schema

### `app_users`

Stores application users.

- `id` UUID primary key
- `email` unique normalized email
- `display_name`
- `password_hash` scrypt password hash
- timestamps

### `app_sessions`

Stores short-lived HTTP-only cookie sessions.

- `id` UUID primary key
- `user_id` FK to `app_users`
- `token_hash` SHA-256 hash of opaque session token
- request metadata
- `expires_at`, `revoked_at`, timestamps

### `app_journals`

Stores journal records.

- `id` UUID primary key
- `owner_id` FK to `app_users`
- non-sensitive metadata: `title`, `template`, `mood`
- `content` journal body text
- timestamps

### `app_ai_rate_limits`

Stores per-user AI request buckets.

- `rate_key`
- `window_start`
- `request_count`
- unique index on `rate_key + window_start`

## Database Authorization

Journal queries filter by `owner_id` at the application level using Drizzle ORM. Each API route checks the authenticated user and restricts access to the owner's own records.

## Security Controls

- HTTP-only, SameSite=Lax session cookie with 30-minute inactivity timeout.
- Passwords hashed with scrypt and random salts.
- Strict API input validation, size limits, UUID checks, and text normalization.
- No `dangerouslySetInnerHTML`; Markdown preview renders React text nodes.
- AI prompt-injection mitigation through a hidden system prompt and allowed template/mood enums.
- Per-user AI rate limiting in PostgreSQL.
- Production headers: CSP, frame denial, nosniff, referrer policy, permissions policy.
- Trakteer QR Code is generated locally as a data URL; no third-party QR image service is contacted.
- Source download endpoint excludes `.env`, dependencies, build output, and common cache directories.
- Generic error responses; stack traces are not exposed to clients.
