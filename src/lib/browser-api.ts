"use client";
import { browserDb } from "./supabase-browser";

export async function accessToken(): Promise<string> {
  const { data, error } = await browserDb().auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Sign in again to continue.");
  return data.session.access_token;
}
export async function api<T>(path: string, method = "GET", payload?: unknown): Promise<T> {
  const headers: Record<string, string> = { Authorization: "Bearer " + await accessToken() };
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, {
    method, headers, body: payload === undefined ? undefined : JSON.stringify(payload), cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}
