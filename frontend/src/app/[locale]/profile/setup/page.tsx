import { BioForm } from "@/components/auth/bio-form";

export default function ProfileSetupPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decoración de fondo para que se vea Pro */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-4">
          Configuración de <span className="text-cyan-500">Biotipo</span>
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto font-medium">
          Completa el escaneo perimetral para que BioAxis Engine adapte tu volumen de entrenamiento y macros.
        </p>
      </div>

      <div className="relative z-10 w-full">
        <BioForm />
      </div>
      
      <footer className="mt-12 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
        BioAxis v1.0 • Sistema de Optimización Biomecánica
      </footer>
    </div>
  );
}