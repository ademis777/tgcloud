"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cloud, LockKeyhole, Mail } from "lucide-react";
import { browserDb } from "@/lib/supabase-browser";
import { PreferencesControls, usePreferences } from "@/components/preferences";

export default function AuthPage() {
  const router = useRouter();
  const {t}=usePreferences();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const db = browserDb();
      db.auth.getUser().then(({ data }) => { if (data.user) router.replace("/dashboard"); });
      const { data: listener } = db.auth.onAuthStateChange((_event, session) => {
        if (session?.user) router.replace("/dashboard");
      });
      return () => listener.subscription.unsubscribe();
    } catch { setError("missing"); }
  }, [router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const db = browserDb();
      if (mode === "signup") {
        const { data, error: e } = await db.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: new URL("/auth", window.location.href).toString() },
        });
        if (e) throw e;
        if (data.session) router.replace("/dashboard");
        else setMessage(t("authConfirm"));
      } else {
        const { error: e } = await db.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
        router.replace("/dashboard");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "auth"); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout"><div className="auth-card">
    <div className="auth-top"><Link href="/" className="back"><ArrowLeft size={16}/> {t("backHome")}</Link><PreferencesControls/></div>
    <div className="auth-brand"><Cloud size={26}/> TG<span>Cloud</span></div>
    <h1>{mode === "login" ? t("welcome") : t("createAccount")}</h1>
    <p className="muted">{t("authSubtitle")}</p>
    <form onSubmit={submit} className="stack">
      <label><span>{t("email")}</span><div className="input-icon"><Mail size={18}/><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("emailExample")}/></div></label>
      <label><span>{t("password")}</span><div className="input-icon"><LockKeyhole size={18}/><input type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("passwordHint")}/></div></label>
      {error && <div role="alert" className="notice error">{error==="missing"?t("authMissing"):error==="auth"?t("authError"):error}</div>}
      {message && <div role="status" className="notice success">{message}</div>}
      <button className="button primary wide" disabled={busy}>{busy ? t("loading") : mode === "login" ? t("authSubmitLogin") : t("authSubmitSignup")}</button>
    </form>
    <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
      {mode === "login" ? t("authSwitchSignup") : t("authSwitchLogin")}
    </button>
  </div></main>;
}
