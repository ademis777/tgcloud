"use client";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownToLine, Cloud, File, Folder, FolderPlus, HardDriveUpload, LogOut, Settings2, Trash2, UploadCloud, UserRound, Pencil } from "lucide-react";
import { browserDb } from "@/lib/supabase-browser";
import { accessToken, api } from "@/lib/browser-api";
import { PreferencesControls, usePreferences } from "@/components/preferences";
import { accountProfile, type AccountProfile } from "@/lib/account-profile";
import { FilePreviewModal, FileThumbnail } from "@/components/file-preview";
import { previewDescriptor } from "@/lib/file-preview";
import { Eye } from "lucide-react";
import { runBulkDelete, type BulkDeleteProgress } from "@/lib/bulk-delete";
import { runUploadQueue, validateUploadCount, MAX_UPLOAD_BATCH, type UploadProgress } from "@/lib/upload-queue";

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
  const [catalogOnlyFile, setCatalogOnlyFile] = useState<FileRow | null>(null);
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set());
  const [bulkProgress, setBulkProgress] = useState<BulkDeleteProgress | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadFailures, setUploadFailures] = useState<{ id: string; name: string; error: string | null }[]>([]);
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
  const allVisibleSelected = visibleFiles.length > 0 && visibleFiles.every(f => selectedFileIds.has(f.id));
  const partiallySelected = !allVisibleSelected && visibleFiles.some(f => selectedFileIds.has(f.id));
  const selectedCount = visibleFiles.filter(f => selectedFileIds.has(f.id)).length;
  function navigateToFolder(id: string | null) {
    if (busy) return;
    setSelected(id);
    setSelectedFileIds(new Set());
    setBulkProgress(null);
  }
  function toggleFileSelection(id: string, checked: boolean) {
    if (busy) return;
    setSelectedFileIds(previous => {
      const next = new Set(previous);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }
  function toggleSelectAll(checked: boolean) {
    if (busy) return;
    setSelectedFileIds(checked ? new Set(visibleFiles.map(f => f.id)) : new Set());
  }
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
  async function renameFolder(folder: FolderRow) {
    const entered = window.prompt(t("dashboardFolderRenamePrompt"), folder.name);
    if (entered === null) return;
    const name = entered.trim();
    if (!name || name === folder.name) return;
    if (name.length > 120) { setError(t("dashboardFolderLong")); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: updateError } = await browserDb().from("folders")
        .update({ name }).eq("id", folder.id).eq("user_id", userId).select("id").single();
      if (updateError || !data) throw updateError || new Error(t("dashboardFolderRenameError"));
      setNotice(t("dashboardFolderRenamed"));
      await refresh();
    } catch (e) {
      setError(t("dashboardFolderRenameError") + " " + (e instanceof Error ? e.message : ""));
    } finally { setBusy(false); }
  }
  async function deleteFolder(folder: FolderRow) {
    const directFiles = files.filter(f => f.folder_id === folder.id).length;
    const childFolders = folders.filter(f => f.parent_id === folder.id).length;
    const hasContents = directFiles > 0 || childFolders > 0;
    if (!window.confirm(t(hasContents ? "dashboardFolderDeleteConfirmNonEmpty" : "dashboardFolderDeleteConfirm", {
      name: folder.name, files: directFiles, folders: childFolders,
    }))) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: deletionError } = await browserDb()
        .rpc("delete_folder_keep_contents", { p_folder_id: folder.id });
      if (deletionError) throw deletionError;
      if (selected === folder.id) setSelected(folder.parent_id);
      setNotice(t(hasContents ? "dashboardFolderDeletedWithContents" : "dashboardFolderDeleted"));
      await refresh();
    } catch (e) {
      setError(t("dashboardFolderDeleteError") + " " + (e instanceof Error ? e.message : ""));
    } finally { setBusy(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const batch = Array.from(event.target.files || []);
    event.target.value = "";
    if (!batch.length || busy) return;
    if (!connection.connected) { setError(t("dashboardNeedConnection")); return; }
    if (!userId) { setError(t("dashboardLoadError")); return; }
    if (!validateUploadCount(batch.length)) {
      setError(t("uploadBatchLimit", { count: MAX_UPLOAD_BATCH }));
      return;
    }
    const destination = selected;
    setBusy(true); setError(""); setNotice(""); setUploadProgress(null); setBulkProgress(null); setUploadFailures([]);
    try {
      const result = await runUploadQueue(batch, async file => {
        const safeName = file.name.replace(/[/\\\\\u0000-\u001f]/g, "_").slice(0, 200) || "file";
        const path = userId + "/" + crypto.randomUUID() + "/" + safeName;
        const { error: stagingError } = await browserDb().storage.from("pending-files")
          .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
        if (stagingError) throw stagingError;
        // One commit request per file, sequentially; do not automatically retry after
        // a Telegram error because the channel may already contain its message.
        await api("/api/files/commit", "POST", { path, name: safeName, folderId: destination });
      }, setUploadProgress, t("dashboardTooLarge"));
      if (result.failed) {
        setUploadFailures(result.items.filter(item => item.status === "failed").map(item => ({ id: item.id, name: item.name, error: item.error })));
        setError(t("uploadBatchPartial", { uploaded: result.uploaded, failed: result.failed }));
      } else {
        setNotice(t("uploadBatchComplete", { count: result.uploaded }));
      }
      await refresh();
    } catch (e) {
      setError(t("uploadBatchError") + (e instanceof Error ? " " + e.message : ""));
      await refresh().catch(() => {});
    } finally {
      setUploadProgress(null);
      setBusy(false);
    }
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
    setBusy(true); setError(""); setNotice(""); setCatalogOnlyFile(null);
    try {
      const result = await api<{telegramDeleted:boolean; removedFromCatalog:boolean}>("/api/files/" + encodeURIComponent(file.id), "DELETE");
      setNotice(t(result.telegramDeleted ? "dashboardRemoved" : "dashboardCatalogOnlyRemoved"));
      setSelectedFileIds(old => { const next = new Set(old); next.delete(file.id); return next; });
      await refresh();
    } catch (e) {
      setError(t("dashboardRemoveError") + " " + (e instanceof Error ? e.message : ""));
      setCatalogOnlyFile(file);
    } finally { setBusy(false); }
  }
  async function removeCatalogOnly() {
    const file = catalogOnlyFile;
    if (!file || busy || !window.confirm(t("dashboardCatalogOnlyConfirm"))) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/files/" + encodeURIComponent(file.id) + "?catalogOnly=1", "DELETE");
      setCatalogOnlyFile(null);
      setSelectedFileIds(old => { const next = new Set(old); next.delete(file.id); return next; });
      setNotice(t("dashboardCatalogOnlyRemoved"));
      await refresh();
    } catch (e) {
      setError(t("dashboardRemoveError") + " " + (e instanceof Error ? e.message : ""));
    } finally { setBusy(false); }
  }
  async function removeSelectedFiles() {
    if (busy) return;
    const batch = visibleFiles.filter(f => selectedFileIds.has(f.id));
    if (!batch.length) return;
    if (!window.confirm(t("bulkDeleteConfirm", { count: batch.length }))) return;
    setBusy(true); setError(""); setNotice(""); setCatalogOnlyFile(null); setBulkProgress(null);
    try {
      const result = await runBulkDelete(
        batch.map(f => f.id),
        async id => {
          const response = await api<{ removedFromCatalog: boolean }>("/api/files/" + encodeURIComponent(id), "DELETE");
          if (!response.removedFromCatalog) throw new Error("Deletion was not confirmed.");
        },
        setBulkProgress,
        2,
      );
      // Keep unsuccessful files selected so the user can inspect and retry them.
      setSelectedFileIds(new Set(result.failedIds));
      if (result.failedIds.length) {
        setError(t("bulkDeletePartial", {
          deleted: result.deletedIds.length, failed: result.failedIds.length,
        }) + (result.firstError ? " " + result.firstError : ""));
      } else {
        setNotice(t("bulkDeleteComplete", { count: result.deletedIds.length }));
      }
      await refresh();
    } catch (e) {
      setError(t("bulkDeleteRefreshError") + (e instanceof Error ? " " + e.message : ""));
    } finally {
      setBulkProgress(null);
      setBusy(false);
    }
  }
  async function logout() { await browserDb().auth.signOut(); router.replace("/auth"); }
  return <main className="app-layout">
    <aside className="sidebar"><Link href="/" className="brand"><span className="brand-icon"><Cloud size={22}/></span>TG<span>Cloud</span></Link>
      <span className="sidebar-label">{t("dashboardWorkspace")}</span>
      <button disabled={busy} className={!selected ? "side-link active" : "side-link"} onClick={() => navigateToFolder(null)}><File size={18}/> {t("dashboardFiles")}</button>
      <Link className="side-link" href="/connect"><Settings2 size={18}/> {t("dashboardConnection")}</Link>
      <Link className="side-link" href="/settings"><UserRound size={18}/> {t("settings")}</Link>
      <div className="sidebar-bottom">
        {profile && <Link href="/settings" className="account-card account-card-link" aria-label={t("dashboardAccount")}>
          <div className="account-avatar">
            {profile.avatarUrl && !avatarFailed ? <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} /> : <UserRound size={20} aria-hidden="true"/>}
          </div>
          <div className="account-details"><strong title={profile.displayName}>{profile.displayName}</strong><span title={profile.userLabel}>{profile.userLabel}</span><small>{t(profile.authMethod === "telegram" ? "dashboardTelegramAccount" : "dashboardEmailAccount")}</small></div>
        </Link>}
        <div className="connection">{connection.connected ? t("dashboardConnected") : t("dashboardDisconnected")}</div><button className="side-link" onClick={logout}><LogOut size={18}/> {t("dashboardLogout")}</button></div>
    </aside>
    <section className="dashboard-content"><div className="dashboard-top"><div><div className="eyebrow">{t("dashboardTitle")}</div><h1>{selectedName}</h1><p className="muted">{t("dashboardIntro")}</p></div>
      <div className="dashboard-actions"><PreferencesControls/><button className="button outline" disabled={busy || !userId} onClick={createFolder}><FolderPlus size={17}/> {t("dashboardNewFolder")}</button>
        <label className={"button primary " + (busy || !userId ? "disabled" : "")}><UploadCloud size={17}/> {t("dashboardUpload")}<input type="file" multiple hidden disabled={busy || !userId || !connection.connected} onChange={upload}/></label></div></div>
      {!connection.connected && <div className="setup-banner"><div><strong>{t("dashboardSetup")}</strong><p>{t("dashboardSetupBody")}</p></div><Link href="/connect" className="button primary">{t("dashboardConfigure")} →</Link></div>}
      {error && <div className="notice error" role="alert"><div>{error}
        {uploadFailures.length > 0 && <ul className="upload-failure-summary">{uploadFailures.map(item =>
          <li key={item.id}><strong>{item.name}</strong>{item.error ? ": " + item.error : ""}</li>
        )}</ul>}</div>
        {catalogOnlyFile && <div className="catalog-fallback"><button type="button" className="button outline" disabled={busy} onClick={removeCatalogOnly}>{t("dashboardCatalogOnlyAction")}</button></div>}
      </div>}
      {notice && <div className="notice success" role="status">{notice}</div>}
      {selected && <button disabled={busy} className="text-button align-left" onClick={() => navigateToFolder(parent)}>{t("dashboardBack")}</button>}
      <div className="catalog-title"><h2>{t("dashboardCatalog")}</h2><span>{t("dashboardItems",{count:visibleFolders.length + visibleFiles.length})}</span></div>
      {visibleFiles.length > 0 && <div className="bulk-toolbar" aria-label={t("bulkActions")}>
        <span className="bulk-selection-count">{t("bulkSelected", { count: selectedCount })}</span>
        <button type="button" className="bulk-clear" disabled={busy || selectedCount === 0} onClick={() => toggleSelectAll(false)}>{t("bulkClear")}</button>
        <button type="button" className="button bulk-delete-button" disabled={busy || selectedCount === 0} onClick={removeSelectedFiles}><Trash2 size={16}/>{t("bulkDeleteButton", { count: selectedCount })}</button>
      </div>}
      {uploadProgress && <div className="upload-queue" aria-label={t("uploadQueueTitle")}>
        <div className="upload-queue-top">
          <strong>{t("uploadQueueTitle")}</strong>
          <span aria-live="polite">{t("uploadBatchProgress", { done: uploadProgress.done, total: uploadProgress.total, uploaded: uploadProgress.uploaded, failed: uploadProgress.failed })}</span>
        </div>
        <progress value={uploadProgress.done} max={uploadProgress.total || 1}/>
        <div className="upload-queue-items">{uploadProgress.items.map(item =>
          <div className={"upload-queue-item status-" + item.status} key={item.id}>
            <span title={item.name}>{item.name}</span>
            <small title={item.error || ""}>{item.status === "uploaded" ? t("uploadStatusDone") :
              item.status === "failed" ? t("uploadStatusFailed") :
              item.status === "uploading" ? t("uploadStatusUploading") : t("uploadStatusPending")}</small>
            {item.error && <p title={item.error}>{item.error}</p>}
          </div>)}
        </div>
      </div>}
      {bulkProgress && <div className="bulk-progress" role="status" aria-live="polite">
        <span>{t("bulkProgress", { done: bulkProgress.done, total: bulkProgress.total, deleted: bulkProgress.deleted, failed: bulkProgress.failed })}</span>
        <progress value={bulkProgress.done} max={bulkProgress.total || 1}/>
      </div>}
      {visibleFolders.length === 0 && visibleFiles.length === 0 && <div className="empty"><HardDriveUpload size={38}/><h3>{t("dashboardEmpty")}</h3><p>{t("dashboardEmptyBody")}</p></div>}
      {visibleFolders.length > 0 && <div className="folder-grid">{visibleFolders.map(f =>
        <div className="folder-tile" key={f.id}>
          <button type="button" className="folder-open" onClick={() => navigateToFolder(f.id)} disabled={busy} title={f.name}>
            <Folder size={23}/><span>{f.name}</span>
          </button>
          <div className="folder-actions">
            <button type="button" disabled={busy} onClick={() => renameFolder(f)} title={t("dashboardFolderRename")} aria-label={t("dashboardFolderRename") + ": " + f.name}><Pencil size={16}/></button>
            <button type="button" disabled={busy} onClick={() => deleteFolder(f)} title={t("dashboardFolderDelete")} aria-label={t("dashboardFolderDelete") + ": " + f.name}><Trash2 size={16}/></button>
          </div>
        </div>)}</div>}
      {visibleFiles.length > 0 && <div className="file-table"><div className="file-head">
        <label className="file-select-cell" title={t("bulkSelectAll")}><input type="checkbox" checked={allVisibleSelected} disabled={busy} ref={element => { if (element) element.indeterminate = partiallySelected; }} onChange={event => toggleSelectAll(event.target.checked)} aria-label={t("bulkSelectAll")}/></label>
        <span>{t("dashboardFileName")}</span><span>{t("dashboardSize")}</span><span>{t("dashboardStatus")}</span><span>{t("dashboardActions")}</span></div>
        {visibleFiles.map(f => <div className="file-row" key={f.id}>
        <label className="file-select-cell" title={t("bulkSelectFile", { name: f.name })}><input type="checkbox" checked={selectedFileIds.has(f.id)} disabled={busy} onChange={event => toggleFileSelection(f.id,event.target.checked)} aria-label={t("bulkSelectFile", { name: f.name })}/></label>
        <span className="file-name"><FileThumbnail file={f}/><button type="button" className="file-name-link" title={f.name} disabled={f.status !== "ready" || previewDescriptor(f.mime_type,f.name).kind === "unsupported"} onClick={() => setPreviewFile(f)}>{f.name}</button></span><span className="muted">{prettySize(f.size_bytes)}</span>
          <span className={f.status === "ready" ? "badge ready" : f.status === "failed" ? "badge failed" : "badge"} title={f.last_error || ""}>{f.status === "ready" ? t("dashboardReady") : f.status === "failed" ? t("dashboardFailed") : t("dashboardPending")}</span>
          <span className="file-buttons"><button title={t("previewOpen")} aria-label={t("previewOpen")+": "+f.name} disabled={f.status !== "ready" || previewDescriptor(f.mime_type,f.name).kind === "unsupported"} onClick={() => setPreviewFile(f)}><Eye size={18}/></button><button title={t("dashboardDownload")} disabled={f.status !== "ready"} onClick={() => download(f)}><ArrowDownToLine size={18}/></button><button title={t("dashboardRemove")} disabled={busy} onClick={() => remove(f)}><Trash2 size={17}/></button></span></div>)}</div>}
      <div className="dashboard-footnote">{t("dashboardLimit")}</div>
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} onDownload={()=>download(previewFile)}/>}
    </section>
  </main>;
}
