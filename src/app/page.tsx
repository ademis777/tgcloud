import Link from "next/link";
import { ArrowRight, Bot, Cloud, FolderOpen, LockKeyhole, ShieldCheck } from "lucide-react";

const features = [
  { icon: FolderOpen, title: "Файлы и папки", text: "Привычный файловый менеджер вместо поиска сообщений в Telegram." },
  { icon: Bot, title: "Ваш бот и канал", text: "Хранилище подключается к вашему собственному Telegram-каналу." },
  { icon: LockKeyhole, title: "Приватный доступ", text: "Доступ к каталогу проверяется по аккаунту; токен бота остаётся на сервере." },
];
export default function Home() {
  return <main className="site">
    <header className="nav shell"><Link className="brand" href="/"><span className="brand-icon"><Cloud size={22}/></span>TG<span>Cloud</span></Link>
      <nav><a href="#how">Как работает</a><a href="#security">Безопасность</a><Link className="nav-cta" href="/auth">Войти <ArrowRight size={15}/></Link></nav>
    </header>
    <section className="hero shell">
      <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> TG-CLOUD 2.0 · CLOSED BETA</div>
        <h1>Ваше облако.<br/><span>На базе Telegram.</span></h1>
        <p>Организуйте фотографии, документы и видео в удобном личном кабинете. Файлы отправляются в ваш собственный Telegram-канал.</p>
        <div className="actions"><Link className="button primary" href="/auth">Начать настройку <ArrowRight size={18}/></Link><a className="button subtle" href="#how">Как это устроено</a></div>
        <div className="hero-note"><ShieldCheck size={17}/> Тестовая версия · сейчас проверяем работу с небольшими файлами</div>
      </div>
      <div className="hero-panel">
        <div className="window-top"><span/><span/><span/><b>MY CLOUD</b></div>
        <div className="mock-side"><strong>Обзор</strong><span>Мои файлы</span><span>Документы</span><span>Фото и видео</span></div>
        <div className="mock-main"><div className="mock-heading"><b>Мои файлы</b><small>Ваш личный каталог</small></div>
          <div className="mock-cards"><div><FolderOpen/> Проекты</div><div><FolderOpen/> Фотографии</div><div><FolderOpen/> Документы</div></div>
          <div className="mock-file"><span>PDF</span><div><b>Documents.pdf</b><small>Личный каталог</small></div><span>✓</span></div>
          <div className="mock-file"><span>IMG</span><div><b>Summer.jpg</b><small>Личный каталог</small></div><span>✓</span></div>
        </div>
      </div>
    </section>
    <section id="how" className="section shell"><div className="section-label">01 / ПРОСТОЙ ПОДХОД</div><h2>Не нужно искать файлы<br/>среди тысяч сообщений.</h2>
      <div className="feature-grid">{features.map(({icon:Icon,title,text}) => <article className="feature" key={title}><div className="feature-icon"><Icon/></div><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
    <section id="security" className="section shell security-box"><div><div className="section-label">02 / ПРОЗРАЧНОСТЬ</div><h2>Честно о текущей версии</h2><p>На первом этапе доступна интеграционная beta с ограничением файла 8 МиБ. Обработка больших файлов, потоковое видео, платежи и дополнительные функции появятся после отдельного тестирования. Мы не называем этот выпуск end-to-end encrypted.</p></div><Link className="button primary" href="/auth">Попробовать beta <ArrowRight size={16}/></Link></section>
    <footer className="shell footer"><span>© TG-Cloud</span><span>Built for real file ownership · Beta</span></footer>
  </main>;
}
