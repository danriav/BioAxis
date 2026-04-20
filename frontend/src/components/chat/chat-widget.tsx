"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, Bot, User } from "lucide-react";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  // Estilo de burbujas (simulado para el ejemplo visual)
  const [chatHistory] = useState([
    { role: 'bot', text: '¡Hola! Soy tu Bio-Copiloto. ¿En qué puedo ayudarte con tu entrenamiento hoy?' }
  ]);

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-[350px] md:w-[400px] h-[500px] bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          >
            {/* HEADER DEL CHAT */}
            <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400">
                  <Bot size={20} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white">Bio-Copiloto</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Motor Alpha Activo</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* ÁREA DE MENSAJES */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-medium leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-cyan-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-300 rounded-tl-none border border-slate-700'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* INPUT DE TEXTO */}
            <div className="p-4 bg-slate-950/50 border-t border-slate-800">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Pregúntame sobre macros, rutinas..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-5 pr-14 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600"
                />
                <button className="absolute right-2 p-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition-all">
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[8px] text-center text-slate-600 mt-3 uppercase font-black tracking-widest">
                Powered by BioAxis AI Engine
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÓN FLOTANTE */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-500 ${
          isOpen 
          ? "bg-slate-800 text-slate-400 rotate-90" 
          : "bg-cyan-500 text-slate-950 hover:shadow-[0_0_20px_#06b6d4]"
        }`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} className="animate-pulse" />}
      </motion.button>
    </div>
  );
}