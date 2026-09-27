# TG-Cloud Telegram login (OIDC)

This is login for the TG-Cloud PLATFORM, not a customer's personal storage bot.
**Do not use the Bot API token as the OIDC Client Secret. Do not commit any secret.**

## 1. Create the platform login bot

- Visit [@BotFather](https://t.me/BotFather) and create one TG-Cloud-branded bot with `/newbot` (or select an existing dedicated platform bot).
- Open the [BotFather mini app](https://t.me/botfather?startapp), select that bot → **Login Widget**. Switch to **OpenID Connect Login** if offered.
- Register the Allowed URLs below as separate entries (the exact Supabase callback is essential):
  - `https://tg-cloud.pro`
  - `https://wljmoqwrgcwgnxrzhlqj.supabase.co/auth/v1/callback`
- Note the **OIDC Client ID** and **OIDC Client Secret** shown by BotFather. These are distinct from the normal Bot API token. Keep them private. Use default `RS256` signing.

## 2. Configure Supabase Auth

Open [tg-cloud-v2 → Authentication → Sign In / Providers](https://supabase.com/dashboard/project/wljmoqwrgcwgnxrzhlqj/auth/providers), scroll to **Custom OAuth Providers**, then **New Provider**.

| Setting | Value |
|---|---|
| Configuration | Auto-discovery (OIDC) |
| Identifier | `custom:telegram` |
| Name | Telegram |
| Issuer URL | `https://oauth.telegram.org` |
| Client ID / Client Secret | From BotFather Login Widget (enter directly in Supabase) |
| Scopes | `openid profile` |
| Email optional | **ON** (required; Telegram does not supply email) |
| Enabled | ON, after completing all other values |

The provider's displayed Callback URL must match the BotFather redirect URI above. Leave PKCE/nonce validation at secure defaults. Do not request `phone` or `telegram:bot_access` scopes for basic login.

In [Authentication → URL Configuration](https://supabase.com/dashboard/project/wljmoqwrgcwgnxrzhlqj/auth/url-configuration):
- Site URL: `https://tg-cloud.pro`
- Additional redirect URL: `https://tg-cloud.pro/auth`
- Do not use a wildcard for untrusted hosts. If necessary, add specific test hosts separately.

## 3. Enable the real login button in Vercel

After the provider exists and works, set `NEXT_PUBLIC_TELEGRAM_LOGIN_ENABLED=true` in **Vercel Project → Settings → Environment Variables → Production**, and **redeploy**. It is deliberately false by default: users should not be sent to a provider that has not been configured.

The application uses:
```ts
await browserDb().auth.signInWithOAuth({
  provider: "custom:telegram",
  options: { redirectTo: new URL("/auth", window.location.origin).toString() },
});
```

The browser Supabase client handles the returned session; authenticated users go to `/dashboard`. All existing RLS policies continue to use `auth.uid()`. Email/password login remains available. Telegram login alone does not create a customer's personal storage bot or authorize access to their Telegram channel.

## 4. Live tests

- Open an incognito window and authenticate with Telegram; check that a new user appears in **Supabase Authentication → Users** with a custom Telegram identity.
- Close and reopen browser, sign in again with the same Telegram account; check it resolves to the **same Supabase user ID**.
- Log out and confirm `/dashboard` sends a signed-out browser to `/auth`; test the private file APIs reject missing or invalid sessions.
- Test Telegram login refusal, back navigation, two different Telegram identities, and the existing email flow.
- Check none of the credentials are in the browser bundle, app URLs or repository.
- An existing email account is not automatically the same identity as a later Telegram login; account linking and migration should be designed/tested explicitly rather than silently merging user files.

Official references:
- https://core.telegram.org/bots/telegram-login
- https://supabase.com/docs/guides/auth/custom-oauth-providers
