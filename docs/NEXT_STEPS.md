# Execution sequence (no artificial month-by-month roadmap)

1. Connect production Supabase and apply SQL; run two-account RLS tests.
2. Deploy the foundation to Vercel; connect domain; test registration and Telegram onboarding.
3. Verify actual send/retrieve/file checksum/cleanup and hard failure recovery under real accounts.
4. Implement dedicated worker + local Telegram Bot API server, resumable transfers, safe retries and streaming; stop using the small-file limit only after real end-to-end tests.
5. Complete nested folders, file moves, storage reconciliation, monitoring, backups and truthful deletion semantics.
6. Research Ukraine-compatible payment provider, then implement verified webhooks, subscription ledger, invoices and entitlement checks.
7. Improve onboarding for nontechnical users with guided screenshots and Telegram deep links. BotFather cannot be automated by the standard Bot API.

Do not turn marketing copy or UI simulations into claims that functionality is already complete.
