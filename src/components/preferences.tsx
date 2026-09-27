"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Globe2, Moon, Sun } from "lucide-react";
import { browserDb } from "@/lib/supabase-browser";
import { type Locale, type MessageKey, type Theme, isLocale, localeLabels, translate } from "@/lib/i18n";

type PreferencesContextValue = {
  locale: Locale;
  publicLocales: Locale[];
  theme: Theme;
  setLocale: (value: Locale)=>void;
  toggleTheme: ()=>void;
  t: (key:MessageKey,parameters?:Record<string,string|number>)=>string;
};
const PreferencesContext = createContext<PreferencesContextValue | null>(null);
function saveCookie(name:string,value:string) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = name + "=" + encodeURIComponent(value) + "; Max-Age=31536000; Path=/; SameSite=Lax" + secure;
}
export function PreferencesProvider({ initialLocale, initialTheme, publicLocales, children }: {
  initialLocale: Locale; initialTheme: Theme; publicLocales: Locale[]; children:ReactNode;
}) {
  const [locale,setLocaleState] = useState<Locale>(initialLocale);
  const [theme,setTheme] = useState<Theme>(initialTheme);
  useEffect(()=> {
    document.documentElement.lang = locale;
    saveCookie("tgcloud-locale",locale);
  },[locale]);
  useEffect(()=> {
    document.documentElement.dataset.theme = theme;
    saveCookie("tgcloud-theme",theme);
  },[theme]);
  useEffect(()=>{
    let alive = true;
    let restoredUserId: string | null = null;
    let db: ReturnType<typeof browserDb>;
    try { db = browserDb(); } catch { return; }
    async function restore(userId:string) {
      if (restoredUserId === userId) return;
      restoredUserId = userId;
      const {data,error} = await db.from("user_preferences").select("locale").eq("user_id",userId).maybeSingle();
      if (alive && !error && data && isLocale(data.locale)) setLocaleState(data.locale);
    }
    void db.auth.getUser().then(({data})=>{
      if (alive && data.user) void restore(data.user.id);
    }).catch(()=>{});
    const {data:listener}=db.auth.onAuthStateChange((event,session)=>{
      if (event === "SIGNED_OUT") {
        restoredUserId = null;
        if (alive) setLocaleState(current=>publicLocales.includes(current) ? current : publicLocales[0]);
      } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        // Supabase recommends deferring async DB calls from onAuthStateChange.
        if(session?.user) setTimeout(()=>{ if(alive) void restore(session.user.id); },0);
      }
    });
    return ()=>{alive=false;listener.subscription.unsubscribe();};
  },[publicLocales]);
  return <PreferencesContext.Provider value={{
    locale,publicLocales,theme,
    setLocale:value=>setLocaleState(value),
    toggleTheme:()=>setTheme(prev=>prev==="dark"?"light":"dark"),
    t:(key,params)=>translate(locale,key,params),
  }}>{children}</PreferencesContext.Provider>;
}
export function usePreferences():PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("PreferencesProvider is missing.");
  return context;
}
/** Public picker lists four global languages plus one relevant regional language. */
export function PreferencesControls() {
  const {locale,publicLocales,theme,setLocale,toggleTheme,t} = usePreferences();
  const selected = publicLocales.includes(locale) ? locale : "__account__";
  return <div className="preferences-controls">
    <label className="locale-picker">
      <Globe2 size={16} aria-hidden="true"/>
      <span className="sr-only">{t("language")}</span>
      <select aria-label={t("language")} value={selected} onChange={e=>{
        if(publicLocales.includes(e.target.value as Locale))setLocale(e.target.value as Locale);
      }}>
        {selected === "__account__" && <option value="__account__" hidden disabled>{localeLabels[locale]}</option>}
        {publicLocales.map(code=><option value={code} key={code}>{localeLabels[code]}</option>)}
      </select>
    </label>
    <button className="theme-toggle" type="button" onClick={toggleTheme} title={theme==="dark"?t("themeLight"):t("themeDark")} aria-label={theme==="dark"?t("themeLight"):t("themeDark")}>
      {theme==="dark"?<Sun size={17} aria-hidden="true"/>:<Moon size={17} aria-hidden="true"/>}
    </button>
  </div>;
}
