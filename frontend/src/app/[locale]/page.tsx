import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function LocalizedHomePage() {
  const locale = useLocale();
  const t = useTranslations("home");

  const nextLocale = locale === "es" ? "en" : "es";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="text-base text-zinc-600">{t("description")}</p>
      <Link className="text-blue-600 underline" href={`/${nextLocale}`}>
        {t("switchLanguage")}
      </Link>
    </main>
  );
}
