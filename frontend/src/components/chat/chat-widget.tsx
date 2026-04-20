"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, Bot, Loader2 } from "lucide-react";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: '¡Hola! Soy tu Bio-Copiloto. ¿En qué puedo ayudarte hoy?' }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
        message: userMsg 
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: "Lo siento, perdí la conexión con la base." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[350px] md:w-[400px] h-[500px] bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* HEADER */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400"><Bot size={18} /></div>
                <p className="text-xs font-black uppercase tracking-widest text-white">Bio-Copiloto</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>

            {/* MENSAJES */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                    max-w-[85%] 
                    p-4 
                    rounded-2xl 
                    h-auto 
                    min-h-[40px]
                    ${msg.role === 'user' 
                        ? 'bg-cyan-600 text-white rounded-tr-none shadow-lg shadow-cyan-900/20' 
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50 shadow-xl'}
                    `}>
                    {/* 🟢 Movemos el prose y el estilo aquí */}
                    <div className="prose prose-invert max-w-none text-[13px] leading-relaxed">
                        <ReactMarkdown>
                        {msg.text}
                        </ReactMarkdown>
                    </div>
                    </div>
                </div>
            ))}
            
            {/* El indicador de "escribiendo" también debe ser h-auto */}
            {isTyping && (
                <div className="flex justify-start">
                <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700 h-auto">
                    <Loader2 size={14} className="animate-spin text-cyan-500" />
                </div>
                </div>
            )}
            </div>

            {/* INPUT */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50">
              <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe tu duda..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-xs text-white focus:border-cyan-500 outline-none"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1.5 p-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-cyan-500 p-4 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] text-slate-950"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </motion.button>
    </div>
  );
}