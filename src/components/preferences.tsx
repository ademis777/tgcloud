"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Globe2, Moon, Sun } from "lucide-react";
import { type Locale, type MessageKey, type Theme, localeCodes, localeLabels, translate } from "@/lib/i18n";

type PreferencesContextValue = {
  locale: Locale; theme: Theme; setLocale: (value: Locale)=>void; toggleTheme: ()=>void;
  t: (key:MessageKey,parameters?:Record<string,string|number>)=>string;
};
const PreferencesContext = createContext<PreferencesContextValue | null>(null);
function saveCookie(name:string,value:string) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = name + "=" + encodeURIComponent(value) + "; Max-Age=31536000; Path=/; SameSite=Lax" + secure;
}
export function PreferencesProvider({ initialLocale, initialTheme, children }: {
  initialLocale:Locale; initialTheme:Theme; children:ReactNode;
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
  return <PreferencesContext.Provider value={{
    locale,theme, setLocale: value=>setLocaleState(value),
    toggleTheme:()=>setTheme(prev=>prev==="dark"?"light":"dark"),
    t:(key,params)=>translate(locale,key,params),
  }}>{children}</PreferencesContext.Provider>;
}
export function usePreferences():PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("PreferencesProvider is missing.");
  return context;
}
export function PreferencesControls() {
  const {locale,theme,setLocale,toggleTheme,t} = usePreferences();
  return <div className="preferences-controls">
    <label className="locale-picker">
      <Globe2 size={16} aria-hidden="true"/>
      <span className="sr-only">{t("language")}</span>
      <select aria-label={t("language")} value={locale} onChange={e=>setLocale(e.target.value as Locale)}>
        {localeCodes.map(code=><option value={code} key={code}>{localeLabels[code]}</option>)}
      </select>
    </label>
    <button className="theme-toggle" type="button" onClick={toggleTheme} title={theme==="dark"?t("themeLight"):t("themeDark")} aria-label={theme==="dark"?t("themeLight"):t("themeDark")}>
      {theme==="dark"?<Sun size={17} aria-hidden="true"/>:<Moon size={17} aria-hidden="true"/>}
    </button>
  </div>;
}
