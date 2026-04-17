import { redirect } from "next/navigation";

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  // Redirige directamente al super-dashboard y nos saltamos el onboarding viejo
  redirect(`/${locale}/dashboard`);
}