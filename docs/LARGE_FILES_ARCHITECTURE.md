# Large files — phase 1 foundation (not yet enabled)

The existing private upload/download flow remains capped at 8 MiB and is unchanged.
The new `large_transfer_jobs` table is metadata for a separate worker; this is
not a 2 GB shipping claim. Do **not** simply raise `MAX_BYTES` in the existing
Vercel route.

## Verified constraints
- Hosted Bot API `sendDocument`: up to 50 MB; standard `getFile` download up to 20 MB.
- Self-hosted Telegram Local Bot API Server: uploads up to **2000 MB decimal**
  (2,000,000,000 bytes), downloads without Telegram's hosted 20 MB ceiling.
- Vercel function request/response payload: 4.5 MB, and functions have execution
  duration limits. Do not proxy full large file bodies through them.
- Supabase supports TUS resumable uploads, but project-wide/bucket file size
  settings and Storage transfer/egress costs must be checked before enabling it.

Sources:
- https://core.telegram.org/bots/api#using-a-local-bot-api-server
- https://core.telegram.org/bots/features#local-bot-api
- https://vercel.com/docs/functions/limitations
- https://supabase.com/docs/guides/storage/uploads/resumable-uploads

## Target design
Browser (authenticated) -> upload-gateway (chunk/TUS, direct, TLS) ->
private disk/object staging -> background worker -> local Telegram Bot API ->
private Telegram channel. Vercel only authenticates and coordinates small JSON
requests; the gateway/worker must verify the Supabase JWT and ownership of a job.
After Telegram returns the message and file identifiers, the worker uses its
service role to create/update the normal `files` row and marks job `ready`.

The gateway must use a short-lived owner-scoped upload ticket (or validate the
Supabase JWT for *every* transfer request). No bot tokens, Telegram file URL,
service-role key, or publicly readable staging object can reach the browser.
Bound input size to 2,000,000,000 bytes, verify recorded size/checksum and
ensure folder ownership. Staging keys must be random and owner-bound.
Never share bot credentials with the web client. The worker must maintain
idempotency and recover "sending" jobs by reconciliation: network timeouts
can occur **after** Telegram has posted a message, so blind retries duplicate it.
Create rows using the same owner-scoped origin fields (tg_chat_id, tg_bot_id,
tg_message_id, tg_file_id) as the existing deletion flow.

## Deployment prerequisites
1. Choose and connect an always-on Linux worker host with durable staging space,
   enough bandwidth and TLS gateway. No such host was found in the connected
   Vercel deployment list; do not enable the UI until a host exists.
2. Obtain Telegram `api_id` and `api_hash` via https://my.telegram.org,
   stored only as host secrets. Start official `telegram-bot-api --local`
   with persistent working directory.
3. Before switching an existing bot from hosted Bot API, follow Telegram's
   documented `logOut` migration flow and test with a dedicated test bot first.
4. Decide staging location and capacity/cost (local persistent disk vs private
   S3-compatible storage). Prefer direct browser-to-gateway resumable chunks;
   consider Supabase TUS only after checking storage plan and double-egress costs.
5. Build signed/authenticated create/status/cancel API and actual gateway/worker.
   Stream downloads through the gateway with HTTP Range/206 and short-lived tickets.
6. Test 100 MB, 500 MB, 1 GB and just under 2000 MB upload, seek/download,
   network interruption, duplicate-reconciliation, user isolation and cleanup.

## State machine
`created -> uploading -> staged -> sending -> ready`. Failure/cancellation
transitions are restricted in `src/lib/large-transfers.ts`. During `sending`,
a timeout is not safe to interpret as a failed Telegram write. The DB row is
service-role-written; the owner has read-only RLS access for progress display.
