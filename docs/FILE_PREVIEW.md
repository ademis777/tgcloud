# Authenticated file preview

TG-Cloud supports inline preview of images, video, audio, PDF and UTF-8 text.
The dashboard uses a private owner-verified GET /api/files/:id?view=1 endpoint,
supplying the same bearer authorization as ordinary downloads. No public
Supabase preview bucket and no public Telegram file links are created.

The browser materializes a temporary blob URL for each modal and image thumbnail,
revoking it when no longer in use. Uploaded HTML, SVG, JavaScript and unknown
types are not rendered inline; unsupported files remain downloadable.
Existing saved files gain preview without a migration or reupload.

Beta constraint: video is fetched into browser memory as a complete file
(up to the existing 8 MiB limit) before playback. A Range/206 streaming
implementation and persistent generated thumbnails are separate future work
before raising that limit.
