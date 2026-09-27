/** Safe, display-only profile details from a Supabase-authenticated session. */
type ProfileIdentity = {
  provider: string;
  identity_data?: Record<string, unknown> | null;
};
type ProfileUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: ProfileIdentity[] | null;
};
export type AccountProfile = {
  displayName: string;
  userLabel: string;
  avatarUrl: string | null;
  authMethod: "telegram" | "email";
};
function readText(value:unknown):string {
  return typeof value === "string" ? value.trim().slice(0,160) : "";
}
function httpsImage(value:unknown):string | null {
  const candidate = readText(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}
export function accountProfile(user:ProfileUser):AccountProfile {
  const identity = user.identities?.find(i => i.provider === "custom:telegram");
  const metadata = user.user_metadata || {};
  const data = identity?.identity_data || metadata;
  const telegram = Boolean(identity || metadata.iss === "https://oauth.telegram.org");
  const displayName = readText(data.name) || readText(data.full_name) || readText(data.given_name) || readText(metadata.name) || readText(user.email?.split("@")[0]) || "TG-Cloud User";
  const username = readText(data.preferred_username) || readText(metadata.preferred_username);
  const userLabel = telegram && username ? "@" + username.replace(/^@/, "") : readText(user.email) || (telegram ? "Telegram" : "TG-Cloud");
  return {
    displayName,
    userLabel,
    avatarUrl: telegram ? httpsImage(data.picture || metadata.picture) : httpsImage(metadata.avatar_url),
    authMethod: telegram ? "telegram" : "email",
  };
}
