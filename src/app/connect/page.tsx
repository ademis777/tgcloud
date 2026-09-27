"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, ExternalLink, Send } from "lucide-react";
import { api } from "@/lib/browser-api";
import { browserDb } from "@/lib/supabase-browser";

type Channel = { id: string; title: string };
type Connection = { bot_username: string; channel_id: string; channel_title: string };
export default function ConnectPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [existing, setExisting] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    browserDb().auth.getUser().then(({ data }) => { if (!data.user) router.replace("/auth"); }).catch(() => router.replace("/auth"));
    api<{connection: Connection | null}>("/api/telegram/connection").then(x => setExisting(x.connection)).catch(() => {});
  }, [router]);
  async function discover() {
    setBusy(true); setError(""); setNotice(""); setChannels([]);
    try {
      const r = await api<{bot: string; channels: Channel[]}>("/api/telegram/discover", "POST", { token });
      setChannels(r.channels);
      setNotice(r.channels.length ? "Бот @" + r.bot + " обнаружен. Выберите хранилище ниже." : "Бот найден, но новые сообщения канала не обнаружены. Опубликуйте запись в канале после добавления бота администратором и повторите поиск.");
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось найти каналы. Chat ID можно ввести вручную."); }
    finally { setBusy(false); }
  }
  async function connect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/telegram/connection", "POST", { token, channelId });
      setToken(""); router.push("/dashboard"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка подключения."); }
    finally { setBusy(false); }
  }
  return <main className="shell page-top">
    <header className="inner-nav"><Link href="/dashboard" className="back"><ArrowLeft size={17}/> В кабинет</Link><span className="eyebrow">TG-CLOUD · SETUP</span></header>
    <div className="page-heading"><div className="feature-icon"><Bot/></div><h1>Подключение хранилища</h1><p>Три простых шага. Ваш бот должен иметь право публиковать документы в личном Telegram-канале.</p></div>
    {existing && <div className="notice success"><CheckCircle2 size={17}/> Сейчас подключён @{existing.bot_username} — {existing.channel_title || existing.channel_id}</div>}
    <div className="wizard">
      <article className="wizard-step"><div className="number">01</div><div><h2>Создайте Telegram-бота</h2><p>Нажмите на ссылку, откройте BotFather, отправьте /newbot и следуйте подсказкам. Скопируйте полученный токен. Никому его не передавайте.</p>
        <a className="button outline" target="_blank" rel="noreferrer" href="https://t.me/BotFather">Открыть BotFather <ExternalLink size={16}/></a></div></article>
      <article className="wizard-step"><div className="number">02</div><div><h2>Создайте приватный канал</h2><p>В Telegram: Новый канал → Приватный → Добавьте созданного бота в администраторы и разрешите публикацию сообщений. После этого опубликуйте в канале любое тестовое сообщение.</p>
        <p className="muted">Обычный Bot API не может автоматически создавать ботов или каналы вместо пользователя.</p></div></article>
      <article className="wizard-step"><div className="number">03</div><div><h2>Свяжите канал с TG-Cloud</h2>
        <form onSubmit={connect} className="stack"><label><span>Токен от BotFather</span><input type="password" required autoComplete="off" value={token} onChange={e => setToken(e.target.value)} placeholder="123456789:ABC..." /></label>
        <button className="button outline" type="button" onClick={discover} disabled={busy || !token.trim()}><Send size={16}/> Найти мои каналы</button>
        {channels.length > 0 && <label><span>Обнаруженные каналы</span><select value={channelId} onChange={e => setChannelId(e.target.value)}><option value="">Выберите канал</option>{channels.map(c => <option key={c.id} value={c.id}>{c.title} ({c.id})</option>)}</select></label>}
        <label><span>ID канала (если поиск не сработал)</span><input required value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="-1001234567890"/></label>
        {error && <div role="alert" className="notice error">{error}</div>}
        {notice && <div role="status" className="notice success">{notice}</div>}
        <button className="button primary" disabled={busy || !token || !channelId}>{busy ? "Проверяем..." : "Проверить и подключить"} <ArrowRight size={17}/></button>
        </form></div></article>
    </div>
    <p className="muted footer-hint">Токен передаётся только по HTTPS в серверный API и хранится в зашифрованном виде. Не вставляйте его в публичные сообщения.</p>
  </main>;
}
