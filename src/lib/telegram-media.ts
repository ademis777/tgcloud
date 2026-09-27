export type SentMedia = {
  message_id: number;
  document?: { file_id: string };
  video?: { file_id: string };
  audio?: { file_id: string };
  animation?: { file_id: string };
  voice?: { file_id: string };
  video_note?: { file_id: string };
  photo?: { file_id: string; file_size?: number }[];
};
export function sentMediaFileId(sent: SentMedia): string | null {
  // The Telegram endpoint can classify recognized media instead of returning "document".
  // Preserve the file_id of the actual content that was published.
  return sent.document?.file_id || sent.video?.file_id || sent.audio?.file_id ||
    sent.animation?.file_id || sent.voice?.file_id || sent.video_note?.file_id ||
    sent.photo?.at(-1)?.file_id || null;
}
