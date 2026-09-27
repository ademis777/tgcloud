import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TG-Cloud — Your personal Telegram-backed cloud",
  description: "A simpler way to organize your personal Telegram file storage. Beta version.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
