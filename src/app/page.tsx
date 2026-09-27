"use client";
import Link from "next/link";
import { ArrowRight, Bot, Cloud, FolderOpen, LockKeyhole, ShieldCheck } from "lucide-react";
import { PreferencesControls, usePreferences } from "@/components/preferences";

export default function Home() {
  const {t}=usePreferences();
  const features = [
    { icon: FolderOpen, title: t("homeFeature1"), text: t("homeFeature1Body") },
    { icon: Bot, title: t("homeFeature2"), text: t("homeFeature2Body") },
    { icon: LockKeyhole, title: t("homeFeature3"), text: t("homeFeature3Body") },
  ];
  return <main className="site">
    <header className="nav shell">
      <Link className="brand" href="/"><span className="brand-icon"><Cloud size={22}/></span>TG<span>Cloud</span></Link>
      <nav><a href="#how">{t("navHow")}</a><a href="#security">{t("navSecurity")}</a><PreferencesControls/><Link className="nav-cta" href="/auth">{t("navLogin")} <ArrowRight size={15}/></Link></nav>
    </header>
    <section className="hero shell">
      <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> TG-CLOUD 2.0 · {t("heroEyebrow")}</div>
        <h1>{t("heroTitle1")}<br/><span>{t("heroTitle2")}</span></h1>
        <p>{t("heroBody")}</p>
        <div className="actions"><Link className="button primary" href="/auth">{t("heroAction")} <ArrowRight size={18}/></Link><a className="button subtle" href="#how">{t("heroSecondary")}</a></div>
        <div className="hero-note"><ShieldCheck size={17}/> {t("heroNote")}</div>
      </div>
      <div className="hero-panel" aria-label={t("demoFiles")}>
        <div className="window-top"><span/><span/><span/><b>MY CLOUD</b></div>
        <div className="mock-side"><strong>{t("demoFiles")}</strong><span>{t("demoDocuments")}</span><span>{t("demoPhotos")}</span></div>
        <div className="mock-main"><div className="mock-heading"><b>{t("demoFiles")}</b><small>{t("demoSubtitle")}</small></div>
          <div className="mock-cards"><div><FolderOpen/> {t("demoProjects")}</div><div><FolderOpen/> {t("demoPhotos")}</div><div><FolderOpen/> {t("demoDocuments")}</div></div>
          <div className="mock-file"><span>PDF</span><div><b>Documents.pdf</b><small>{t("demoLibrary")}</small></div><span>✓</span></div>
          <div className="mock-file"><span>IMG</span><div><b>Summer.jpg</b><small>{t("demoLibrary")}</small></div><span>✓</span></div>
        </div>
      </div>
    </section>
    <section id="how" className="section shell"><div className="section-label">01 / {t("homeSection1")}</div><h2>{t("homeHead")}</h2>
      <div className="feature-grid">{features.map(({icon:Icon,title,text}) => <article className="feature" key={title}><div className="feature-icon"><Icon/></div><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
    <section id="security" className="section shell security-box"><div><div className="section-label">02 / {t("homeSection2")}</div><h2>{t("homeHonest")}</h2><p>{t("homeLimit")}</p></div><Link className="button primary" href="/auth">{t("homeTry")} <ArrowRight size={16}/></Link></section>
    <footer className="shell footer"><span>© TG-Cloud</span><span>{t("homeFooter")}</span></footer>
  </main>;
}
