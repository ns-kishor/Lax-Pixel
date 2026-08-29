'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send, Loader2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AIChat() {
  const { chatOpen, setChatOpen, chatMessages, addChatMessage, chatLoading, setChatLoading, user, view, selectProduct, products } = useStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [chatOpen]);

  const send = async () => {
    if (!input.trim() || chatLoading) return;
    const msg = input.trim();
    setInput('');
    addChatMessage({ id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() });
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId: user?.id || 'guest', context: `Current page: ${view}. Products: ${products.map(p => p.name).join(', ')}` }),
      });
      const data = await res.json();
      addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: data.response, timestamp: new Date() });
    } catch {
      addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: 'I apologize for the interruption. Please try again.', timestamp: new Date() });
    }
    setChatLoading(false);
  };

  const quickActions = ['Recommend products', 'Tell me about shipping', 'Help me find a gift', 'What is trending?'];

  return (
    <div>
      {!chatOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-2xl z-50 animate-pulse-glow cursor-pointer"
        >
          <MessageCircle className="w-5 h-5" />
        </motion.div>
      )}

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-6rem)] rounded-2xl border border-white/10 bg-background shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">NOIR AI</p>
                  <p className="text-[10px] text-green-400">Online</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setChatOpen(false)}><X className="w-4 h-4" /></Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-foreground text-background rounded-br-md' : 'bg-secondary rounded-bl-md'}`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {chatMessages.length <= 2 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {quickActions.map(a => (
                  <button key={a} onClick={() => { setInput(a); }} className="px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">{a}</button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-white/5">
              <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-center gap-2">
                <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask NOIR AI..." className="flex-1 h-10 bg-white/5 border-white/10 text-sm rounded-lg" disabled={chatLoading} />
                <Button type="submit" size="icon" className="h-10 w-10 bg-foreground text-background rounded-lg shrink-0" disabled={chatLoading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}