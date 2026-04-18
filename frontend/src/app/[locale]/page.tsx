import { redirect } from "next/navigation";

// Definimos la interfaz indicando que params es una Promesa (Requisito de Next.js 15)
interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  // 1. Esperamos (await) a que los parámetros de la URL estén listos
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  // 2. Ahora que locale es un string real (es, en, etc.), redirigimos
  redirect(`/${locale}/dashboard`);
}