"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, ExternalLink, Send } from "lucide-react";
import { api } from "@/lib/browser-api";
import { browserDb } from "@/lib/supabase-browser";
import { PreferencesControls, usePreferences } from "@/components/preferences";

type Channel = { id: string; title: string };
type Connection = { bot_username: string; channel_id: string; channel_title: string };
export default function ConnectPage() {
  const router = useRouter();
  const {t}=usePreferences();
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
      setNotice(r.channels.length ? t("setupFound",{bot:r.bot}) : t("setupNoChannels"));
    } catch (e) { setError(e instanceof Error ? e.message : t("setupDiscoverError")); }
    finally { setBusy(false); }
  }
  async function connect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/telegram/connection", "POST", { token, channelId });
      setToken(""); router.push("/dashboard"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : t("setupConnectionError")); }
    finally { setBusy(false); }
  }
  return <main className="shell page-top">
    <header className="inner-nav"><Link href="/dashboard" className="back"><ArrowLeft size={17}/> {t("backDashboard")}</Link><div className="top-controls"><span className="eyebrow">TG-CLOUD · SETUP</span><PreferencesControls/></div></header>
    <div className="page-heading"><div className="feature-icon"><Bot/></div><h1>{t("setupTitle")}</h1><p>{t("setupIntro")}</p></div>
    {existing && <div className="notice success"><CheckCircle2 size={17}/> {t("setupCurrent",{bot:existing.bot_username,channel:existing.channel_title||existing.channel_id})}</div>}
    <div className="wizard">
      <article className="wizard-step"><div className="number">01</div><div><h2>{t("setupStep1")}</h2><p>{t("setupStep1Body")}</p>
        <a className="button outline" target="_blank" rel="noreferrer" href="https://t.me/BotFather">{t("setupOpenBotfather")} <ExternalLink size={16}/></a></div></article>
      <article className="wizard-step"><div className="number">02</div><div><h2>{t("setupStep2")}</h2><p>{t("setupStep2Body")}</p>
        <p className="muted">{t("setupStep2Note")}</p></div></article>
      <article className="wizard-step"><div className="number">03</div><div><h2>{t("setupStep3")}</h2>
        <form onSubmit={connect} className="stack"><label><span>{t("setupToken")}</span><input type="password" required autoComplete="off" value={token} onChange={e => setToken(e.target.value)} placeholder="123456789:ABC..." /></label>
        <button className="button outline" type="button" onClick={discover} disabled={busy || !token.trim()}><Send size={16}/> {t("setupFind")}</button>
        {channels.length > 0 && <label><span>{t("setupSelect")}</span><select value={channelId} onChange={e => setChannelId(e.target.value)}><option value="">{t("setupSelectPlaceholder")}</option>{channels.map(c => <option key={c.id} value={c.id}>{c.title} ({c.id})</option>)}</select></label>}
        <label><span>{t("setupChannelId")}</span><input required value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="-1001234567890"/></label>
        {error && <div role="alert" className="notice error">{error}</div>}
        {notice && <div role="status" className="notice success">{notice}</div>}
        <button className="button primary" disabled={busy || !token || !channelId}>{busy ? t("setupBusy") : t("setupConnect")} <ArrowRight size={17}/></button>
        </form></div></article>
    </div>
    <p className="muted footer-hint">{t("setupPrivacy")}</p>
  </main>;
}
