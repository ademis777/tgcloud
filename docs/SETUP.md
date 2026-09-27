# First online deployment

## 1. Supabase

- Create a new Supabase project. In SQL Editor run \`supabase/migrations/0001_init.sql\` once.
- Authentication > Providers: enable Email. Keep email confirmation enabled for a public site.
- Authentication > URL Configuration: use your production domain as Site URL and add exact allowed redirects (production /auth, Vercel preview domains only if intended, and http://localhost:3000/auth for development).
- Project Settings > API: copy Project URL and publishable/anon key. The service_role key is server-only.
- Storage: confirm bucket \`pending-files\` exists and is NOT public.

## 2. Secrets

- Create \`BOT_TOKEN_ENCRYPTION_KEY\` from 32 random bytes, base64-encoded. Save it in a password manager. Losing or changing it without a migration makes stored Telegram connections unreadable.
- Supply \`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\`, \`BOT_TOKEN_ENCRYPTION_KEY\` in Vercel Project > Settings > Environment Variables. Add to Production and Preview as appropriate.
- Never paste secrets into a GitHub issue, README, public Vercel build log, or ChatGPT.

## 3. Vercel

- Import GitHub \`ademis777/tgcloud\` as a Next.js project.
- Set Root Directory to repository root; install command \`npm install\`; build command \`npm run build\`.
- Add environment variables before testing authenticated flows. Redeploy after changing env vars.

## 4. Domain

- Vercel Project > Settings > Domains > Add your domain.
- Add the exact DNS records suggested by Vercel at your current registrar. Do not change unrelated email DNS/MX records.
- Once HTTPS works, update Supabase Authentication Site URL and redirect allowlist to the actual domain.

## 5. Smoke test with two accounts

- Register and verify email for two separate users.
- User A cannot read user B's folders, file records or staging objects.
- Create a bot in @BotFather; create a private Telegram channel, add the bot as administrator and allow it to post. Publish a test channel post.
- In the setup wizard paste the bot token, discover/select the channel, verify connection.
- Upload a small file (<8 MiB), refresh, download, and compare bytes. Test invalid token, revoked bot rights, interrupted upload, duplicate filenames and catalog-only deletion.
- Test client bundle and browser network panel: service role, encryption key and bot token must not be present in public assets.
- Do not advertise public readiness until these tests pass.

## Operational limitations

Vercel is web/API only. A dedicated worker and local Bot API server are a separate deployment for larger files. Supabase private storage is temporary staging, not the final user data store. Payment integration and complete account recovery are not part of this foundation.

## Telegram login

Follow [TELEGRAM_LOGIN.md](./TELEGRAM_LOGIN.md) to set up a separate platform bot, its OIDC credentials, the Supabase custom provider and the production-only feature flag. Email sign-in remains the fallback while the external provider is not configured.

## Account language and public locale lists

Apply `supabase/migrations/0002_user_preferences.sql` once (already applied to production project `tg-cloud-v2`). Each signed-in user can select any of six languages at `/settings`; the preference is saved in `public.user_preferences` under owner-only RLS, then restored through Supabase Auth on other devices. Public locale menus show English, French, Spanish, German plus either Ukrainian or Russian based on the primary browser language (preferred) or the Vercel IP-country header (fallback); other regions show four. No exact IP address is stored for this feature.
