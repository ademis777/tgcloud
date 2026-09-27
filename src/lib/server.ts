import "server-only";
import { createClient, type User } from "@supabase/supabase-js";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error("Missing required server configuration: " + name);
  return v;
}
export function adminDb() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function requireUser(request: Request): Promise<User | null> {
  const match = /^Bearer (.+)$/i.exec(request.headers.get("authorization") || "");
  if (!match) return null;
  const auth = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.getUser(match[1]);
  return error ? null : data.user;
}
export const unauthorized = () => Response.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
export const failure = (message: string, status = 400) => Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
