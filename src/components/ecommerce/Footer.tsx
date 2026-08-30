'use client';

import { useStore } from '@/lib/store';
import { Sparkles } from 'lucide-react';

export function Footer() {
  const { setView } = useStore();

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full border flex items-center justify-center">
                <span className="text-[10px] font-bold">LP</span>
              </div>
              <span className="text-sm font-extralight tracking-[0.3em]">Lax Pixel</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">AI-powered luxury ecommerce. Curated collections and intelligent shopping.</p>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase font-medium mb-4">Shop</h4>
            <div className="space-y-2.5">
              {['All Products', 'New Arrivals', 'Bestsellers', 'Sale'].map(l => (
                <button key={l} onClick={() => setView('shop')} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase font-medium mb-4">Support</h4>
            <div className="space-y-2.5">
              {[{ l: 'Track Order', v: 'tracking' as const }, { l: 'Contact', v: 'home' as const }, { l: 'FAQ', v: 'home' as const }, { l: 'Returns', v: 'home' as const }].map(({ l, v }) => (
                <button key={l} onClick={() => setView(v)} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase font-medium mb-4">Company</h4>
            <div className="space-y-2.5">
              {[{ l: 'About Lax Pixel', v: 'home' as const }, { l: 'Become a Seller', v: 'auth' as const }, { l: 'Privacy Policy', v: 'home' as const }, { l: 'Terms of Service', v: 'home' as const }].map(({ l, v }) => (
                <button key={l} onClick={() => setView(v)} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-muted-foreground">© 2025 Lax Pixel. All rights reserved.</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            Powered by <Sparkles className="w-3 h-3" /> AI Intelligence
          </p>
        </div>
      </div>
    </footer>
  );
}