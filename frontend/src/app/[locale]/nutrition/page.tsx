import { NutritionDashboard } from "@/components/NutritionDashboard";

export default function NutritionPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      {/* Aquí renderizamos el componente que creamos antes */}
      <NutritionDashboard />
    </main>
  );
}