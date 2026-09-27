import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { PreferencesProvider } from "@/components/preferences";
import { detectLocale, type Theme } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "TG-Cloud — Your personal Telegram-backed cloud",
  description: "A simpler way to organize your personal Telegram file storage. Beta version.",
  robots: { index: false, follow: false },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = detectLocale(cookieStore.get("tgcloud-locale")?.value, headerStore.get("x-vercel-ip-country"), headerStore.get("accept-language"));
  const savedTheme = cookieStore.get("tgcloud-theme")?.value;
  const theme:Theme = savedTheme === "light" ? "light" : "dark";
  return <html lang={locale} data-theme={theme} suppressHydrationWarning>
    <body><PreferencesProvider initialLocale={locale} initialTheme={theme}>{children}</PreferencesProvider></body>
  </html>;
}
