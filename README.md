# TG-Cloud 2.0

Telegram-backed personal file library. Clean rebuild of the May 2026 prototype. The old dashboard/landing design is a visual reference, **not trusted executable code**. Do not upload legacy tokens or the old \`.env.local\`.

**Current status: pre-release foundation**, not a live public cloud. This commit implements a private small-file Telegram flow for integration testing. A separate worker/local Bot API deployment is required before promising 2 GB files, resumable transfers and reliable video streaming. Billing has not been implemented.

## Stack

- Next.js 16 / React 19 / TypeScript — Vercel web and small API requests.
- Supabase Auth, Postgres RLS, private Storage staging.
- Each user connects their own Telegram bot and private channel. Bot token is encrypted at rest with a server-only key. Telegram operations run server-side.
- Initial file limit: 8 MiB. Bigger transfers must use a dedicated worker, not Vercel request bodies.

## Setup

1. Create a Supabase project and run \`supabase/migrations/0001_init.sql\` in SQL Editor.
2. Configure Auth site URL, redirect URLs and email confirmation as described in \`docs/SETUP.md\`.
3. Configure the four environment variables from \`.env.example\` in Vercel (and in a local uncommitted \`.env.local\`).
4. Install with \`npm install\`, then \`npm run typecheck\` and \`npm run build\`.
5. Import this GitHub repository to Vercel, deploy, then connect the domain.

## Trust boundaries

- Only the public Supabase URL and anon key are exposed to browsers.
- The service-role key and bot encryption key must remain exclusively on the server.
- Users can read their own file/folder records via RLS. Only the server accesses encrypted bot credentials and updates Telegram-backed file metadata.
- Storage bucket is private; uploaded files are staged under a user-ID prefix and removed after Telegram confirms storage. Failed transfers stay in private staging for recovery.
- Delete in this MVP means **remove from catalog**. Telegram message deletion can fail or be unavailable for old posts; do not promise physical erasure.
- This version is **not end-to-end encrypted** and does not promise unlimited Telegram storage.

See \`docs/SETUP.md\` and \`docs/NEXT_STEPS.md\`.
