"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { 
  LayoutDashboard, 
  Utensils, 
  User, 
  Dumbbell, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings
} from "lucide-react";

// --- CAMBIO 1: La ruta debe ser /profile/setup ---
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Dumbbell, label: "Entrenamiento", href: "/workout" },
  { icon: Utensils, label: "Nutrición", href: "/nutrition" },
  { icon: User, label: "Perfil", href: "/profile/setup" }, // <-- Ajustado aquí
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();

  const isLoginPage = pathname.includes("/login");
  if (isLoginPage) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="h-screen sticky top-0 bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out z-50 shrink-0"
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
          >
            BIOAXIS
          </motion.span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const fullHref = `/${locale}${item.href}`;
          
          // --- CAMBIO 2: Lógica de activo más flexible ---
          // Esto hace que si estás en /es/profile/setup, el botón /es/profile/setup se ilumine
          const isActive = pathname === fullHref || (item.href !== "/dashboard" && pathname.startsWith(fullHref));
          
          return (
            <Link key={item.href} href={fullHref}>
              <div className={`
                flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group
                ${isActive 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}
              `}>
                <item.icon size={22} className={isActive ? "text-cyan-400" : "group-hover:text-cyan-400"} />
                {!isCollapsed && (
                  <span className="text-sm font-semibold tracking-wide lowercase first-letter:uppercase">
                    {item.label}
                  </span>
                )}
                {isActive && !isCollapsed && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-900 space-y-2">
        <button className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-2xl transition-colors">
          <Settings size={22} />
          {!isCollapsed && <span className="text-sm font-semibold">Ajustes</span>}
        </button>
        <button className="w-full flex items-center gap-4 px-4 py-3 text-rose-400/80 hover:bg-rose-500/10 rounded-2xl transition-colors">
          <LogOut size={22} />
          {!isCollapsed && <span className="text-sm font-semibold">Cerrar Sesión</span>}
        </button>
      </div>
    </motion.aside>
  );
}