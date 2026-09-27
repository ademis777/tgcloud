"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Cloud, UserRound } from "lucide-react";
import { PreferencesControls, usePreferences } from "@/components/preferences";
import { browserDb } from "@/lib/supabase-browser";
import { accountProfile, type AccountProfile } from "@/lib/account-profile";
import { isLocale, localeCodes, localeLabels, type Locale } from "@/lib/i18n";

export default function AccountSettings() {
  const router=useRouter();
  const {locale,t,setLocale}=usePreferences();
  const [draft,setDraft]=useState<Locale>(locale);
  const [userId,setUserId]=useState("");
  const [profile,setProfile]=useState<AccountProfile | null>(null);
  const [avatarFailed,setAvatarFailed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState(false);
  useEffect(()=>{
    let active=true;
    async function load(){
      try {
        const db=browserDb();
        const {data:{user},error:authError}=await db.auth.getUser();
        if(authError || !user) {router.replace("/auth");return;}
        const {data,error:prefError}=await db.from("user_preferences").select("locale").eq("user_id",user.id).maybeSingle();
        if(prefError)throw prefError;
        if(!active)return;
        setUserId(user.id);
        setProfile(accountProfile(user));
        if(data && isLocale(data.locale))setDraft(data.locale);
      }catch{
        if(active)setError("load");
      }finally{
        if(active)setLoading(false);
      }
    }
    void load();
    return ()=>{active=false;};
  },[router]);
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!userId || saving)return;
    setSaving(true);setError("");setSuccess(false);
    try{
      const {error:saveError}=await browserDb().from("user_preferences").upsert(
        {user_id:userId,locale:draft,updated_at:new Date().toISOString()},
        {onConflict:"user_id"}
      );
      if(saveError)throw saveError;
      setLocale(draft);
      setSuccess(true);
    }catch{
      setError("save");
    }finally{
      setSaving(false);
    }
  }
  return <main className="shell page-top settings-page">
    <header className="inner-nav">
      <Link href="/dashboard" className="back"><ArrowLeft size={17}/>{t("backDashboard")}</Link>
      <PreferencesControls/>
    </header>
    <div className="settings-heading"><span className="brand settings-brand"><span className="brand-icon"><Cloud size={21}/></span>TG<span>Cloud</span></span><h1>{t("settingsHeading")}</h1><p className="muted">{t("settingsDescription")}</p></div>
    {loading ? <div className="settings-panel" role="status">{t("loading")}</div> :
      <div className="settings-stack">
        {profile && <section className="settings-panel">
          <h2>{t("settingsAccount")}</h2>
          <div className="settings-user">
            <div className="account-avatar">
              {profile.avatarUrl && !avatarFailed ? <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" onError={()=>setAvatarFailed(true)}/> : <UserRound size={21} aria-hidden="true"/>}
            </div>
            <div className="account-details"><strong>{profile.displayName}</strong><span>{profile.userLabel}</span><small>{t(profile.authMethod==="telegram"?"dashboardTelegramAccount":"dashboardEmailAccount")}</small></div>
          </div>
        </section>}
        <section className="settings-panel">
          <h2>{t("settingsLanguage")}</h2>
          <p className="muted">{t("settingsLanguageHelp")}</p>
          <form onSubmit={save} className="settings-form">
            <label htmlFor="account-locale">{t("language")}</label>
            <select id="account-locale" value={draft} onChange={e=>{setDraft(e.target.value as Locale);setSuccess(false);}} disabled={!userId || saving}>
              {localeCodes.map(code=><option value={code} key={code}>{localeLabels[code]}</option>)}
            </select>
            <button type="submit" className="button primary" disabled={!userId || saving}>{saving?t("settingsLanguageSaving"):t("settingsLanguageSave")}</button>
          </form>
          {error && <div className="notice error" role="alert">{t(error==="save"?"settingsLanguageSaveError":"settingsLanguageLoadError")}</div>}
          {success && <div className="notice success" role="status"><CheckCircle2 size={16}/>{t("settingsLanguageSaved")}</div>}
        </section>
      </div>}
  </main>;
}
