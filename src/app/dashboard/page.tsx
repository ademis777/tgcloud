"use client";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownToLine, Cloud, File, Folder, FolderPlus, HardDriveUpload, LogOut, Settings2, Trash2, UploadCloud, UserRound } from "lucide-react";
import { browserDb } from "@/lib/supabase-browser";
import { accessToken, api } from "@/lib/browser-api";
import { PreferencesControls, usePreferences } from "@/components/preferences";
import { accountProfile, type AccountProfile } from "@/lib/account-profile";

type FolderRow = { id: string; parent_id: string | null; name: string };
type FileRow = { id: string; name: string; size_bytes: number; mime_type: string; folder_id: string | null; status: "pending" | "ready" | "failed"; last_error: string | null; created_at: string };
type Status = { connected: boolean; connection: { bot_username: string; channel_title: string; channel_id: string } | null };
function prettySize(n: number) { return n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KiB" : (n / 1048576).toFixed(1) + " MiB"; }

export default function Dashboard() {
  const router = useRouter();
  const {t} = usePreferences();
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [connection, setConnection] = useState<Status>({ connected: false, connection: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const db = browserDb();
    const [{ data: f, error: fe }, { data: d, error: de }, status] = await Promise.all([
      db.from("folders").select("id,parent_id,name").order("created_at", { ascending: true }),
      db.from("files").select("id,name,size_bytes,mime_type,folder_id,status,last_error,created_at").order("created_at", { ascending: false }),
      api<Status>("/api/telegram/connection"),
    ]);
    if (fe || de) throw new Error(fe?.message || de?.message || "Could not load catalog.");
    setFolders((f || []) as FolderRow[]); setFiles((d || []) as FileRow[]); setConnection(status);
  }, []);
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const { data } = await browserDb().auth.getUser();
        if (!data.user) { router.replace("/auth"); return; }
        if (mounted) { setUserId(data.user.id); setProfile(accountProfile(data.user)); setAvatarFailed(false); }
        await refresh();
      } catch (e) { if (mounted) setError(e instanceof Error ? e.message : t("dashboardLoadError")); }
    }
    void init(); return () => { mounted = false; };
  }, [router, refresh]);
  const visibleFolders = useMemo(() => folders.filter(f => f.parent_id === selected), [folders, selected]);
  const visibleFiles = useMemo(() => files.filter(f => f.folder_id === selected), [files, selected]);
  const parent = selected ? folders.find(f => f.id === selected)?.parent_id || null : null;
  const selectedName = selected ? folders.find(f => f.id === selected)?.name || t("dashboardFolder") : t("dashboardFiles");
  async function createFolder() {
    const name = window.prompt(t("dashboardFolderPrompt"))?.trim();
    if (!name) return;
    if (name.length > 120) { setError(t("dashboardFolderLong")); return; }
    setBusy(true); setError(""); setNotice("");
    const { error: e } = await browserDb().from("folders").insert({ user_id: userId, parent_id: selected, name });
    if (e) setError(e.message); else { setNotice(t("dashboardFolderCreated")); await refresh().catch(x => setError(String(x))); }
    setBusy(false);
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!connection.connected) { setError(t("dashboardNeedConnection")); return; }
    if (file.size > 8 * 1024 * 1024) { setError(t("dashboardTooLarge")); return; }
    const safeName = file.name.replace(/[/\\\u0000-\u001f]/g, "_").slice(0, 200) || "file";
    const path = userId + "/" + crypto.randomUUID() + "/" + safeName;
    setBusy(true); setError(""); setNotice(t("dashboardStaging"));
    try {
      const { error: e } = await browserDb().storage.from("pending-files").upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (e) throw e;
      setNotice(t("dashboardSending"));
      await api("/api/files/commit", "POST", { path, name: safeName, folderId: selected });
      setNotice(t("dashboardUploaded")); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : t("dashboardUploadError")); setNotice(""); await refresh().catch(() => {}); }
    finally { setBusy(false); }
  }
  async function download(file: FileRow) {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/files/" + encodeURIComponent(file.id), { headers: { Authorization: "Bearer " + await accessToken() }, cache: "no-store" });
      if (!response.ok) { const j = await response.json(); throw new Error(j.error || t("dashboardDownloadError")); }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = objectUrl; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    } catch (e) { setError(e instanceof Error ? e.message : t("dashboardDownloadError")); }
  }
  async function remove(file: FileRow) {
    if (!window.confirm(t("dashboardRemoveConfirm"))) return;
    setBusy(true); setError(""); setNotice("");
    try { await api("/api/files/" + encodeURIComponent(file.id), "DELETE"); setNotice(t("dashboardRemoved")); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : t("dashboardRemoveError")); }
    finally { setBusy(false); }
  }
  async function logout() { await browserDb().auth.signOut(); router.replace("/auth"); }
  return <main className="app-layout">
    <aside className="sidebar"><Link href="/" className="brand"><span className="brand-icon"><Cloud size={22}/></span>TG<span>Cloud</span></Link>
      <span className="sidebar-label">{t("dashboardWorkspace")}</span>
      <button className={!selected ? "side-link active" : "side-link"} onClick={() => setSelected(null)}><File size={18}/> {t("dashboardFiles")}</button>
      <Link className="side-link" href="/connect"><Settings2 size={18}/> {t("dashboardConnection")}</Link>
      <div className="sidebar-bottom">
        {profile && <div className="account-card" aria-label={t("dashboardAccount")}>
          <div className="account-avatar">
            {profile.avatarUrl && !avatarFailed ? <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} /> : <UserRound size={20} aria-hidden="true"/>}
          </div>
          <div className="account-details"><strong title={profile.displayName}>{profile.displayName}</strong><span title={profile.userLabel}>{profile.userLabel}</span><small>{t(profile.authMethod === "telegram" ? "dashboardTelegramAccount" : "dashboardEmailAccount")}</small></div>
        </div>}
        <div className="connection">{connection.connected ? t("dashboardConnected") : t("dashboardDisconnected")}</div><button className="side-link" onClick={logout}><LogOut size={18}/> {t("dashboardLogout")}</button></div>
    </aside>
    <section className="dashboard-content"><div className="dashboard-top"><div><div className="eyebrow">{t("dashboardTitle")}</div><h1>{selectedName}</h1><p className="muted">{t("dashboardIntro")}</p></div>
      <div className="dashboard-actions"><PreferencesControls/><button className="button outline" disabled={busy || !userId} onClick={createFolder}><FolderPlus size={17}/> {t("dashboardNewFolder")}</button>
        <label className={"button primary " + (busy || !userId ? "disabled" : "")}><UploadCloud size={17}/> {t("dashboardUpload")}<input type="file" hidden disabled={busy || !userId} onChange={upload}/></label></div></div>
      {!connection.connected && <div className="setup-banner"><div><strong>{t("dashboardSetup")}</strong><p>{t("dashboardSetupBody")}</p></div><Link href="/connect" className="button primary">{t("dashboardConfigure")} →</Link></div>}
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}
      {selected && <button className="text-button align-left" onClick={() => setSelected(parent)}>{t("dashboardBack")}</button>}
      <div className="catalog-title"><h2>{t("dashboardCatalog")}</h2><span>{t("dashboardItems",{count:visibleFolders.length + visibleFiles.length})}</span></div>
      {visibleFolders.length === 0 && visibleFiles.length === 0 && <div className="empty"><HardDriveUpload size={38}/><h3>{t("dashboardEmpty")}</h3><p>{t("dashboardEmptyBody")}</p></div>}
      {visibleFolders.length > 0 && <div className="folder-grid">{visibleFolders.map(f => <button className="folder-tile" key={f.id} onClick={() => setSelected(f.id)}><Folder size={23}/><span>{f.name}</span> →</button>)}</div>}
      {visibleFiles.length > 0 && <div className="file-table"><div className="file-head"><span>{t("dashboardFileName")}</span><span>{t("dashboardSize")}</span><span>{t("dashboardStatus")}</span><span>{t("dashboardActions")}</span></div>
        {visibleFiles.map(f => <div className="file-row" key={f.id}><span className="file-name"><span className="file-glyph"><File size={18}/></span><span title={f.name}>{f.name}</span></span><span className="muted">{prettySize(f.size_bytes)}</span>
          <span className={f.status === "ready" ? "badge ready" : f.status === "failed" ? "badge failed" : "badge"} title={f.last_error || ""}>{f.status === "ready" ? t("dashboardReady") : f.status === "failed" ? t("dashboardFailed") : t("dashboardPending")}</span>
          <span className="file-buttons"><button title={t("dashboardDownload")} disabled={f.status !== "ready"} onClick={() => download(f)}><ArrowDownToLine size={18}/></button><button title={t("dashboardRemove")} disabled={busy} onClick={() => remove(f)}><Trash2 size={17}/></button></span></div>)}</div>}
      <div className="dashboard-footnote">{t("dashboardLimit")}</div>
    </section>
  </main>;
}
