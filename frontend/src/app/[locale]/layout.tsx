import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/i18n/routing";
import { QueryProvider } from "@/providers/query-provider";
import { Sidebar } from "@/components/navigation/sidebar";
import { ChatWidget } from "@/components/chat/chat-widget";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryProvider>
        <div className="flex min-h-screen bg-slate-950">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
          <ChatWidget />
        </div>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
