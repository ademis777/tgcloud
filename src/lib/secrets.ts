import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.BOT_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("Missing BOT_TOKEN_ENCRYPTION_KEY");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("BOT_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return decoded;
}
export function encryptToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}
export function decryptToken(value: string): string {
  const [version, iv, tag, data, ...extra] = value.split(":");
  if (version !== "v1" || !iv || !tag || !data || extra.length) throw new Error("Invalid encrypted token format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
