'use client';

import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

export function Toast() {
  const { toast, clearToast } = useStore();

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-24 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl bg-popover"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
          <span className="text-sm">{toast.message}</span>
          <button onClick={clearToast} className="text-muted-foreground hover:text-foreground ml-2"><XCircle className="w-3.5 h-3.5" /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
