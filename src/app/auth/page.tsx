"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cloud, LockKeyhole, Mail } from "lucide-react";
import { browserDb } from "@/lib/supabase-browser";

export default function AuthPage() {
  const router = useRouter();
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
    } catch { setError("Supabase не подключён. Сначала заполните переменные окружения."); }
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
        else setMessage("Проверьте почту и подтвердите email, затем войдите.");
      } else {
        const { error: e } = await db.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
        router.replace("/dashboard");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка входа."); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout"><div className="auth-card">
    <Link href="/" className="back"><ArrowLeft size={16}/> На главную</Link>
    <div className="auth-brand"><Cloud size={26}/> TG<span>Cloud</span></div>
    <h1>{mode === "login" ? "С возвращением" : "Создайте свой аккаунт"}</h1>
    <p className="muted">Ваше персональное хранилище на базе Telegram.</p>
    <form onSubmit={submit} className="stack">
      <label><span>Email</span><div className="input-icon"><Mail size={18}/><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></div></label>
      <label><span>Пароль</span><div className="input-icon"><LockKeyhole size={18}/><input type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Не менее 8 символов"/></div></label>
      {error && <div role="alert" className="notice error">{error}</div>}
      {message && <div role="status" className="notice success">{message}</div>}
      <button className="button primary wide" disabled={busy}>{busy ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}</button>
    </form>
    <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
      {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
    </button>
  </div></main>;
}
